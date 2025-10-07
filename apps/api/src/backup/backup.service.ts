import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../users/users.schema';
import { Request } from '../requests/requests.schema';
import { AuditLog } from '../audit/audit.schema';
import * as AWS from 'aws-sdk';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream';
import { createGzip } from 'zlib';
import { join } from 'path';

const execAsync = promisify(exec);
const pipelineAsync = promisify(pipeline);

interface BackupMetadata {
  timestamp: Date;
  size: number;
  collections: string[];
  checksum: string;
  version: string;
}

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly s3: AWS.S3;

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Request.name) private readonly requestModel: Model<Request>,
    @InjectModel(AuditLog.name) private readonly auditModel: Model<AuditLog>,
  ) {
    // Initialize AWS S3
    this.s3 = new AWS.S3({
      accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
      region: this.configService.get<string>('AWS_REGION'),
    });
  }

  /**
   * Automated daily backup
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async performDailyBackup() {
    this.logger.log('Starting daily backup process');
    
    try {
      const backupId = `backup-${Date.now()}`;
      await this.createFullBackup(backupId);
      await this.cleanupOldBackups();
      
      this.logger.log(`Daily backup completed successfully: ${backupId}`);
    } catch (error) {
      this.logger.error('Daily backup failed', error);
      throw error;
    }
  }

  /**
   * Create full database backup
   */
  async createFullBackup(backupId: string): Promise<string> {
    const timestamp = new Date();
    const backupDir = `/tmp/backups/${backupId}`;
    const archivePath = `/tmp/backups/${backupId}.tar.gz`;
    
    try {
      // Create backup directory
      await execAsync(`mkdir -p ${backupDir}`);

      // MongoDB dump
      const mongoUri = this.configService.get<string>('MONGODB_URI');
      const dbName = this.configService.get<string>('MONGODB_DB_NAME');
      
      await execAsync(
        `mongodump --uri="${mongoUri}" --db=${dbName} --out=${backupDir}`,
      );

      // Create backup metadata
      const metadata: BackupMetadata = {
        timestamp,
        size: 0, // Will be calculated after compression
        collections: await this.getCollectionNames(),
        checksum: '', // Will be calculated after compression
        version: process.env.npm_package_version || '1.0.0',
      };

      // Write metadata
      await execAsync(
        `echo '${JSON.stringify(metadata, null, 2)}' > ${backupDir}/metadata.json`,
      );

      // Compress backup
      const readStream = createReadStream(backupDir);
      const gzipStream = createGzip({ level: 9 });
      const writeStream = createWriteStream(archivePath);

      await pipelineAsync(readStream, gzipStream, writeStream);

      // Calculate size and checksum
      const { stdout: sizeOutput } = await execAsync(`stat -f%z ${archivePath} 2>/dev/null || stat -c%s ${archivePath}`);
      const size = parseInt(sizeOutput.trim());
      
      const { stdout: checksumOutput } = await execAsync(`sha256sum ${archivePath} | cut -d' ' -f1`);
      const checksum = checksumOutput.trim();

      // Update metadata
      metadata.size = size;
      metadata.checksum = checksum;

      // Upload to S3
      const s3Key = `backups/${timestamp.getFullYear()}/${timestamp.getMonth() + 1}/${backupId}.tar.gz`;
      await this.uploadToS3(archivePath, s3Key, metadata);

      // Cleanup local files
      await execAsync(`rm -rf ${backupDir} ${archivePath}`);

      this.logger.log(`Backup created successfully: ${backupId}, Size: ${this.formatBytes(size)}`);
      return backupId;

    } catch (error) {
      this.logger.error(`Backup creation failed: ${backupId}`, error);
      
      // Cleanup on failure
      try {
        await execAsync(`rm -rf ${backupDir} ${archivePath}`);
      } catch (cleanupError) {
        this.logger.warn('Failed to cleanup backup files', cleanupError);
      }
      
      throw error;
    }
  }

  /**
   * Upload backup to S3
   */
  private async uploadToS3(
    filePath: string,
    s3Key: string,
    metadata: BackupMetadata,
  ): Promise<void> {
    const bucket = this.configService.get<string>('BACKUP_S3_BUCKET');
    
    const uploadParams: AWS.S3.PutObjectRequest = {
      Bucket: bucket,
      Key: s3Key,
      Body: createReadStream(filePath),
      Metadata: {
        timestamp: metadata.timestamp.toISOString(),
        size: metadata.size.toString(),
        checksum: metadata.checksum,
        version: metadata.version,
        collections: metadata.collections.join(','),
      },
      StorageClass: 'STANDARD_IA', // Cheaper storage for backups
      ServerSideEncryption: 'AES256',
    };

    try {
      await this.s3.upload(uploadParams).promise();
      this.logger.log(`Backup uploaded to S3: ${s3Key}`);
    } catch (error) {
      this.logger.error('Failed to upload backup to S3', error);
      throw error;
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backupId: string): Promise<void> {
    this.logger.log(`Starting restore process for backup: ${backupId}`);
    
    const restoreDir = `/tmp/restore/${backupId}`;
    const archivePath = `/tmp/restore/${backupId}.tar.gz`;
    
    try {
      // Create restore directory
      await execAsync(`mkdir -p /tmp/restore`);

      // Download from S3
      const s3Key = await this.findBackupInS3(backupId);
      await this.downloadFromS3(s3Key, archivePath);

      // Extract backup
      await execAsync(`tar -xzf ${archivePath} -C /tmp/restore/`);

      // Verify backup integrity
      await this.verifyBackupIntegrity(restoreDir);

      // Restore to MongoDB
      const mongoUri = this.configService.get<string>('MONGODB_URI');
      const dbName = this.configService.get<string>('MONGODB_DB_NAME');
      
      await execAsync(
        `mongorestore --uri="${mongoUri}" --db=${dbName} --drop ${restoreDir}/${dbName}`,
      );

      // Cleanup
      await execAsync(`rm -rf ${restoreDir} ${archivePath}`);

      this.logger.log(`Restore completed successfully for backup: ${backupId}`);

    } catch (error) {
      this.logger.error(`Restore failed for backup: ${backupId}`, error);
      
      // Cleanup on failure
      try {
        await execAsync(`rm -rf ${restoreDir} ${archivePath}`);
      } catch (cleanupError) {
        this.logger.warn('Failed to cleanup restore files', cleanupError);
      }
      
      throw error;
    }
  }

  /**
   * List available backups
   */
  async listBackups(): Promise<any[]> {
    const bucket = this.configService.get<string>('BACKUP_S3_BUCKET');
    
    try {
      const params: AWS.S3.ListObjectsV2Request = {
        Bucket: bucket,
        Prefix: 'backups/',
      };

      const objects = await this.s3.listObjectsV2(params).promise();
      
      return objects.Contents?.map(obj => ({
        key: obj.Key,
        size: obj.Size,
        lastModified: obj.LastModified,
        storageClass: obj.StorageClass,
      })) || [];

    } catch (error) {
      this.logger.error('Failed to list backups', error);
      throw error;
    }
  }

  /**
   * Cleanup old backups based on retention policy
   */
  private async cleanupOldBackups(): Promise<void> {
    const retentionDays = this.configService.get<number>('BACKUP_RETENTION_DAYS', 30);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    this.logger.log(`Cleaning up backups older than ${retentionDays} days`);

    try {
      const backups = await this.listBackups();
      const oldBackups = backups.filter(
        backup => backup.lastModified && backup.lastModified < cutoffDate,
      );

      for (const backup of oldBackups) {
        await this.deleteBackup(backup.key);
        this.logger.log(`Deleted old backup: ${backup.key}`);
      }

      this.logger.log(`Cleanup completed. Deleted ${oldBackups.length} old backups`);

    } catch (error) {
      this.logger.error('Backup cleanup failed', error);
      throw error;
    }
  }

  /**
   * Delete a specific backup
   */
  private async deleteBackup(s3Key: string): Promise<void> {
    const bucket = this.configService.get<string>('BACKUP_S3_BUCKET');
    
    const params: AWS.S3.DeleteObjectRequest = {
      Bucket: bucket,
      Key: s3Key,
    };

    await this.s3.deleteObject(params).promise();
  }

  /**
   * Download backup from S3
   */
  private async downloadFromS3(s3Key: string, localPath: string): Promise<void> {
    const bucket = this.configService.get<string>('BACKUP_S3_BUCKET');
    
    const params: AWS.S3.GetObjectRequest = {
      Bucket: bucket,
      Key: s3Key,
    };

    const s3Stream = this.s3.getObject(params).createReadStream();
    const writeStream = createWriteStream(localPath);

    await pipelineAsync(s3Stream, writeStream);
  }

  /**
   * Find backup in S3 by ID
   */
  private async findBackupInS3(backupId: string): Promise<string> {
    const backups = await this.listBackups();
    const backup = backups.find(b => b.key.includes(backupId));
    
    if (!backup) {
      throw new Error(`Backup not found: ${backupId}`);
    }
    
    return backup.key;
  }

  /**
   * Verify backup integrity
   */
  private async verifyBackupIntegrity(backupDir: string): Promise<void> {
    const metadataPath = join(backupDir, 'metadata.json');
    
    try {
      const { stdout } = await execAsync(`cat ${metadataPath}`);
      const metadata = JSON.parse(stdout);
      
      // Verify collections exist
      for (const collection of metadata.collections) {
        const collectionPath = join(backupDir, this.configService.get<string>('MONGODB_DB_NAME'), `${collection}.bson`);
        await execAsync(`test -f ${collectionPath}`);
      }
      
      this.logger.log('Backup integrity verified successfully');
      
    } catch (error) {
      this.logger.error('Backup integrity verification failed', error);
      throw new Error('Backup is corrupted or incomplete');
    }
  }

  /**
   * Get collection names
   */
  private async getCollectionNames(): Promise<string[]> {
    const db = this.userModel.db;
    const collections = await db.listCollections().toArray();
    return collections.map(c => c.name);
  }

  /**
   * Format bytes to human readable
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Health check for backup service
   */
  async healthCheck(): Promise<{ status: string; lastBackup?: Date; nextBackup?: Date }> {
    try {
      const backups = await this.listBackups();
      const lastBackup = backups
        .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())[0];

      return {
        status: 'healthy',
        lastBackup: lastBackup?.lastModified,
        nextBackup: this.getNextBackupTime(),
      };
    } catch (error) {
      return { status: 'unhealthy' };
    }
  }

  /**
   * Get next scheduled backup time
   */
  private getNextBackupTime(): Date {
    const now = new Date();
    const nextBackup = new Date();
    nextBackup.setDate(now.getDate() + 1);
    nextBackup.setHours(2, 0, 0, 0);
    
    return nextBackup;
  }
}