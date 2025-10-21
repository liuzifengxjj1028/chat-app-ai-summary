/**
 * 文件上传服务 - 支持断点续传
 */

import { wsService } from './websocket';

const CHUNK_SIZE = 256 * 1024; // 256KB

export interface FileUploadProgress {
  fileId: string;
  filename: string;
  progress: number;
  status: 'initializing' | 'uploading' | 'completed' | 'error' | 'paused';
  error?: string;
}

export type ProgressCallback = (progress: FileUploadProgress) => void;

class FileUploadService {
  private uploads: Map<string, {
    file: File;
    recipient: string;
    fileId?: string;
    currentChunk: number;
    totalChunks: number;
    status: 'initializing' | 'uploading' | 'completed' | 'error' | 'paused';
    progressCallback?: ProgressCallback;
  }> = new Map();

  /**
   * 开始上传文件
   */
  async uploadFile(
    file: File,
    recipient: string,
    progressCallback?: ProgressCallback
  ): Promise<void> {
    const uploadId = `${Date.now()}_${file.name}`;

    // 计算文件哈希（简化版，使用文件名+大小+修改时间）
    const fileHash = await this.calculateFileHash(file);

    // 计算总分片数
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    // 创建上传记录
    this.uploads.set(uploadId, {
      file,
      recipient,
      currentChunk: 0,
      totalChunks,
      status: 'initializing',
      progressCallback,
    });

    this.notifyProgress(uploadId, 0, 'initializing');

    // 发送初始化请求
    wsService.send({
      type: 'file_upload_init',
      filename: file.name,
      fileSize: file.size,
      to: recipient,
      fileHash,
    });

    // 监听服务器响应
    const handler = (data: any) => {
      if (data.type === 'file_upload_ready') {
        const upload = this.uploads.get(uploadId);
        if (upload) {
          upload.fileId = data.fileId;
          upload.status = 'uploading';
          this.startUpload(uploadId);
        }
      } else if (data.type === 'file_upload_progress') {
        this.handleUploadProgress(uploadId, data);
      } else if (data.type === 'file_upload_success') {
        this.handleUploadSuccess(uploadId, data);
      } else if (data.type === 'file_upload_error') {
        this.handleUploadError(uploadId, data.message);
      }
    };

    wsService.onMessage(handler);
  }

  /**
   * 开始上传文件分片
   */
  private async startUpload(uploadId: string): Promise<void> {
    const upload = this.uploads.get(uploadId);
    if (!upload || !upload.fileId) return;

    const { file, fileId, currentChunk, totalChunks } = upload;

    for (let i = currentChunk; i < totalChunks; i++) {
      // 检查是否暂停或取消
      if (upload.status !== 'uploading') {
        break;
      }

      // 读取分片
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      // 转换为Base64
      const chunkData = await this.fileToBase64(chunk);

      // 发送分片
      wsService.send({
        type: 'file_upload_chunk',
        fileId,
        chunkIndex: i,
        chunkData,
      });

      // 更新当前分片
      upload.currentChunk = i + 1;

      // 等待一小段时间避免过载
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // 所有分片发送完毕，通知服务器
    if (upload.currentChunk === totalChunks) {
      wsService.send({
        type: 'file_upload_complete',
        fileId,
      });
    }
  }

  /**
   * 处理上传进度
   */
  private handleUploadProgress(uploadId: string, data: any): void {
    this.notifyProgress(uploadId, data.progress, 'uploading');
  }

  /**
   * 处理上传成功
   */
  private handleUploadSuccess(uploadId: string, data: any): void {
    this.notifyProgress(uploadId, 100, 'completed');
    this.uploads.delete(uploadId);
  }

  /**
   * 处理上传错误
   */
  private handleUploadError(uploadId: string, error: string): void {
    const upload = this.uploads.get(uploadId);
    if (upload) {
      upload.status = 'error';
      this.notifyProgress(uploadId, 0, 'error', error);
    }
  }

  /**
   * 暂停上传
   */
  pauseUpload(uploadId: string): void {
    const upload = this.uploads.get(uploadId);
    if (upload) {
      upload.status = 'paused';
      this.notifyProgress(uploadId, (upload.currentChunk / upload.totalChunks) * 100, 'paused');
    }
  }

  /**
   * 恢复上传（断点续传）
   */
  resumeUpload(uploadId: string): void {
    const upload = this.uploads.get(uploadId);
    if (upload && upload.status === 'paused') {
      upload.status = 'uploading';
      this.startUpload(uploadId);
    }
  }

  /**
   * 取消上传
   */
  cancelUpload(uploadId: string): void {
    this.uploads.delete(uploadId);
  }

  /**
   * 通知进度更新
   */
  private notifyProgress(
    uploadId: string,
    progress: number,
    status: FileUploadProgress['status'],
    error?: string
  ): void {
    const upload = this.uploads.get(uploadId);
    if (upload && upload.progressCallback) {
      upload.progressCallback({
        fileId: upload.fileId || '',
        filename: upload.file.name,
        progress,
        status,
        error,
      });
    }
  }

  /**
   * 计算文件哈希（简化版）
   */
  private async calculateFileHash(file: File): Promise<string> {
    // 简化版：使用文件信息生成哈希
    return `${file.name}_${file.size}_${file.lastModified}`;
  }

  /**
   * 将Blob转换为Base64
   */
  private fileToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // 移除 "data:xxx;base64," 前缀
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * 下载文件
   */
  downloadFile(fileId: string, filename: string, progressCallback?: ProgressCallback): void {
    const chunks: string[] = [];
    let totalChunks = 0;
    let receivedChunks = 0;

    const handler = (data: any) => {
      if (data.type === 'file_download_start' && data.fileId === fileId) {
        totalChunks = data.totalChunks;
        progressCallback?.({
          fileId,
          filename: data.filename,
          progress: 0,
          status: 'uploading',
        });
      } else if (data.type === 'file_download_chunk' && data.fileId === fileId) {
        chunks[data.chunkIndex] = data.chunkData;
        receivedChunks++;

        const progress = (receivedChunks / totalChunks) * 100;
        progressCallback?.({
          fileId,
          filename,
          progress,
          status: 'uploading',
        });
      } else if (data.type === 'file_download_complete' && data.fileId === fileId) {
        try {
          // 按顺序合并所有分片
          console.log(`合并分片: 总共 ${totalChunks} 个, 实际收到 ${chunks.filter(c => c).length} 个`);
          let base64Data = chunks.slice(0, totalChunks).join('');
          console.log(`Base64 数据长度: ${base64Data.length} 字符`);

          // 清理 Base64 数据：移除所有非 Base64 字符（只保留 A-Z, a-z, 0-9, +, /, =）
          base64Data = base64Data.replace(/[^A-Za-z0-9+/=]/g, '');
          console.log(`清理后 Base64 数据长度: ${base64Data.length} 字符`);

          // 转换为Blob并下载
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray]);

          // 创建下载链接
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(url);

          progressCallback?.({
            fileId,
            filename,
            progress: 100,
            status: 'completed',
          });

          // 移除监听器
          wsService.removeMessageHandler(handler);
        } catch (error) {
          console.error('文件下载失败:', error);
          progressCallback?.({
            fileId,
            filename,
            progress: 0,
            status: 'error',
            error: error instanceof Error ? error.message : '下载失败',
          });

          // 移除监听器
          wsService.removeMessageHandler(handler);
        }
      }

      if (data.type === 'file_download_error' && data.fileId === fileId) {
        progressCallback?.({
          fileId,
          filename,
          progress: 0,
          status: 'error',
          error: data.message,
        });

        // 移除监听器
        wsService.removeMessageHandler(handler);
      }
    };

    wsService.onMessage(handler);

    // 发送下载请求
    wsService.send({
      type: 'file_download_request',
      fileId,
    });
  }
}

export const fileUploadService = new FileUploadService();

