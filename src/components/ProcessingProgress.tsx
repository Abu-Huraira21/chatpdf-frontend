import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { API_BASE_URL, TokenManager } from '../services';

interface ProcessingProgressProps {
  documentId: string;
  documentName: string;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

interface ProcessingStatus {
  processing_status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed';
  progress_current: number;
  progress_total: number;
  progress_percentage: number;
  progress_stage: string;
  chunk_count: number;
  can_be_queried: boolean;
  processing_error?: string;
}

export function ProcessingProgress({
  documentId,
  documentName,
  onComplete,
  onError,
}: ProcessingProgressProps) {
  const [status, setStatus] = useState<ProcessingStatus | null>(null);
  const [polling, setPolling] = useState(true);

  useEffect(() => {
    const pollStatus = async () => {
      try {
        const token = TokenManager.getAccessToken();
        const response = await fetch(
          `${API_BASE_URL}/api/documents/${documentId}/processing_status/`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch processing status');
        }

        const data = await response.json();
        setStatus(data);

        // Stop polling if completed or failed
        if (data.processing_status === 'completed') {
          setPolling(false);
          onComplete?.();
        } else if (data.processing_status === 'failed') {
          setPolling(false);
          onError?.(data.processing_error || 'Processing failed');
        }
      } catch (error) {
        console.error('Error polling processing status:', error);
        // Continue polling even on error (might be temporary network issue)
      }
    };

    // Initial poll
    pollStatus();

    // Set up polling interval (every 2 seconds)
    let interval: NodeJS.Timeout | null = null;
    if (polling) {
      interval = setInterval(pollStatus, 2000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [documentId, polling, onComplete, onError]);

  if (!status) {
    return (
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <span className="text-sm text-blue-700">Loading status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = () => {
    switch (status.processing_status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'queued':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <Loader2 className="h-5 w-5 animate-spin text-blue-600" />;
    }
  };

  const getStatusColor = () => {
    switch (status.processing_status) {
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'failed':
        return 'bg-red-50 border-red-200';
      case 'queued':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getStatusText = () => {
    switch (status.processing_status) {
      case 'queued':
        return 'Queued for processing...';
      case 'processing':
        return status.progress_stage
          ? `${status.progress_stage.charAt(0).toUpperCase() + status.progress_stage.slice(1)}...`
          : 'Processing...';
      case 'completed':
        return `Processing complete! (${status.chunk_count} chunks created)`;
      case 'failed':
        return 'Processing failed';
      default:
        return 'Pending...';
    }
  };

  return (
    <Card className={getStatusColor()}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2 w-full min-w-0">
          {getStatusIcon()}
          <span className="truncate min-w-0" title={documentName}>
            {documentName}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-gray-700">{getStatusText()}</p>

        {status.processing_status === 'processing' && status.progress_total > 0 && (
          <div className="space-y-2">
            <Progress value={status.progress_percentage} className="h-2" />
            <div className="flex justify-between text-xs text-gray-600">
              <span>
                {status.progress_current} / {status.progress_total} chunks
              </span>
              <span>{status.progress_percentage}%</span>
            </div>
          </div>
        )}

        {status.processing_status === 'queued' && (
          <p className="text-xs text-gray-600">
            Your document is in the queue and will be processed shortly...
          </p>
        )}

        {status.processing_status === 'failed' && status.processing_error && (
          <p className="text-xs text-red-600">{status.processing_error}</p>
        )}
      </CardContent>
    </Card>
  );
}

