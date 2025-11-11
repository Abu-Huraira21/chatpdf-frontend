import React, { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import { Header } from './components/Header';
import { ChatPanel } from './components/ChatPanel';
import { DocumentPreview } from './components/DocumentPreview';
import { DocumentSidebar } from './components/DocumentSidebar';
import { SignupScreen } from './components/SignupScreen';
import { LoginScreen } from './components/LoginScreen';
import { UploadModal } from './components/UploadModal';
import { SettingsModal } from './components/SettingsModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { ShareModal } from './components/ShareModal';
import { ProfileModal } from './components/ProfileModal';
import { PasswordResetScreen } from './components/PasswordResetScreen';
import { LoadingOverlay } from './components/ui/loading-overlay';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import { useAuthStore, useAppStore, useDocumentsStore } from './stores';
import { useAppReady } from './stores/hooks';

export interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  pageReferences?: number[];
  timestamp: Date;
}

export interface Document {
  id: string;
  name: string;
  pages: number;
  size: string;
  uploadDate: Date;
  file_url?: string;  // PDF file URL for preview
}

type AuthView = 'signup' | 'login' | 'app' | 'passwordReset';

export default function App() {
  const { user, isAuthenticated, isLoading: authLoading, checkAuth, logout } = useAuthStore();
  const { initialize, isInitialized } = useAppStore();
  const { deleteDocument } = useDocumentsStore();
  const { isReady, needsAuth } = useAppReady();
  
  const [authView, setAuthView] = useState<AuthView>('login');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [passwordChangeConfirmOpen, setPasswordChangeConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);

  // Initialize app and check authentication on load
  useEffect(() => {
    const initApp = async () => {
      await initialize();
      await checkAuth();
    };
    initApp();
  }, [initialize, checkAuth]);

  // Update auth view based on authentication state
  useEffect(() => {
    if (isReady) {
      if (isAuthenticated) {
        setAuthView('app');
        // Clear selected document and messages when user logs in
        setSelectedDocument(null);
        setMessages([]);
      } else if (needsAuth) {
        setAuthView('login');
      }
    }
  }, [isReady, isAuthenticated, needsAuth]);

  // Authentication handlers
  const handleLoginSuccess = () => {
    // Login was successful - the auth store will update shortly
    // Don't check state here due to timing, let the useEffect handle it
    setAuthView('app');
  };

  const handleSignupSuccess = () => {
    setAuthView('app');
    if (user) {
      toast.success(`Welcome to DocChat AI, ${user.first_name}!`);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setAuthView('login');
      toast.success('You have been logged out successfully.');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // App state  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  
  // User profile state (legacy - will be replaced by user from AuthService)
  const [userProfile, setUserProfile] = useState({
    name: 'John Doe',
    email: 'john.doe@example.com',
    avatarUrl: '',
    joinDate: 'October 2025',
  });

  // Update user profile when user changes
  useEffect(() => {
    if (user) {
      setUserProfile({
        name: user.full_name,
        email: user.email,
        avatarUrl: user.avatar_url || '',
        joinDate: new Date(user.created_at).toLocaleDateString('en-US', { 
          month: 'long', 
          year: 'numeric' 
        }),
      });
    }
  }, [user]);

  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  const [documents, setDocuments] = useState<Document[]>([]);

  const [messages, setMessages] = useState<Message[]>([]);

  const [highlightedPages, setHighlightedPages] = useState<number[]>([]);

  const handlePageReference = (page: number) => {
    setCurrentPage(page);
    setHighlightedPages([page]);
    setTimeout(() => setHighlightedPages([]), 3000);
  };

  const handleSendMessage = (content: string) => {
    try {
      // Check if this is an AI message from WebSocket
      if (content.startsWith('INTERNAL_AI_MESSAGE:')) {
        const aiMessage = JSON.parse(content.substring('INTERNAL_AI_MESSAGE:'.length));
        setMessages(prev => [...prev, aiMessage]);
        return;
      }
      
      // Parse user message
      const userMessage = JSON.parse(content);
      setMessages(prev => [...prev, userMessage]);
    } catch (error) {
      // Fallback to old behavior for backward compatibility
      const newMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content,
        timestamp: new Date(),
      };
      setMessages([...messages, newMessage]);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  const handleAuthSuccess = () => {
    setAuthView('app');
  };

  const handleUploadComplete = (fileName: string) => {
    toast.success(`${fileName} has been uploaded and is ready to use!`);
  };

  const handleDeleteDocument = (documentId: string) => {
    setDocumentToDelete(documentId);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (documentToDelete) {
      try {
        await deleteDocument(documentToDelete);
        toast.success('Document deleted successfully');
        
        // Clear selection if the deleted document was selected
        if (selectedDocument?.id === documentToDelete) {
          const remainingDocs = documents.filter(doc => doc.id !== documentToDelete);
          if (remainingDocs.length > 0) {
            setSelectedDocument(remainingDocs[0]);
          } else {
            setSelectedDocument(null);
            setMessages([]);
          }
        }
      } catch (error: any) {
        console.error('Delete error:', error);
        toast.error(error.message || 'Failed to delete document');
      } finally {
        setDocumentToDelete(null);
      }
    }
  };

  const handleAvatarUpload = (file: File) => {
    // Simulate uploading the file and getting a URL
    const mockUrl = URL.createObjectURL(file);
    setUserProfile({ ...userProfile, avatarUrl: mockUrl });
    // In a real app, you would upload to a server and get back a URL
  };

  const handlePasswordChangeRequest = () => {
    setProfileModalOpen(false);
    setPasswordChangeConfirmOpen(true);
  };

  const confirmPasswordChange = () => {
    setPasswordChangeConfirmOpen(false);
    toast.info('Logging you out for security...');
    setTimeout(() => {
      setAuthView('passwordReset');
    }, 1000);
  };

  const handlePasswordResetComplete = () => {
    toast.success('Welcome back! Your password has been updated.');
    setAuthView('app');
  };

  useEffect(() => {
    document.title = authView === 'login' ? 'Login' : 'ChatPDF';
  }, [authView]);

  if (authView === 'signup') {
    return (
      <>
        <SignupScreen
          onSignupSuccess={handleAuthSuccess}
          onSwitchToLogin={() => setAuthView('login')}
        />
        <Toaster />
      </>
    );
  }

  if (authView === 'login') {
    return (
      <>
        <LoginScreen
          onLoginSuccess={handleLoginSuccess}
          onSwitchToSignup={() => setAuthView('signup')}
        />
        {/* Show loading overlay on top of login screen while initializing */}
        {(!isReady || authLoading) && (
          <LoadingOverlay 
            title="Initializing DocChat AI..."
            message="Setting up your workspace and checking authentication"
            fullScreen={true}
          />
        )}
        <Toaster />
      </>
    );
  }

  if (authView === 'passwordReset') {
    return (
      <>
        <PasswordResetScreen
          onResetComplete={handlePasswordResetComplete}
          userEmail={userProfile.email}
        />
        <Toaster />
      </>
    );
  }

  return (
    <>
      <div className="flex h-screen bg-gray-50">
        <DocumentSidebar
          documents={documents}
          selectedDocument={selectedDocument}
          onSelectDocument={(doc) => {
            setSelectedDocument(doc);
            setMessages([]);
            setCurrentPage(1);
          }}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          onUploadClick={() => setUploadModalOpen(true)}
          onDeleteDocument={handleDeleteDocument}
          onDocumentsChange={setDocuments}
        />

        <div className="flex flex-col flex-1 overflow-hidden">
          <Header
            document={selectedDocument}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            onSettingsClick={() => setSettingsModalOpen(true)}
            onShareClick={() => setShareModalOpen(true)}
            onDeleteClick={() => selectedDocument && handleDeleteDocument(selectedDocument.id)}
            onProfileClick={() => {
              console.log('Opening profile modal - current state:', profileModalOpen);
              setProfileModalOpen(true);
              console.log('Profile modal state set to true');
            }}
            onLogout={handleLogout}
            userProfile={userProfile}
          />

          <div className="flex flex-1 overflow-hidden">
            <ChatPanel
              messages={messages}
              onSendMessage={handleSendMessage}
              onClearChat={handleClearChat}
              onPageReference={handlePageReference}
              onSettingsClick={() => setSettingsModalOpen(true)}
              currentDocument={selectedDocument ? {
                id: selectedDocument.id,
                name: selectedDocument.name,
              } : undefined}
            />

            {selectedDocument ? (
              <DocumentPreview
                document={selectedDocument}
                currentPage={currentPage}
                highlightedPages={highlightedPages}
                onPageChange={setCurrentPage}
              />
            ) : (
              <div className="flex flex-col w-1/2 bg-gray-100">
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center justify-center p-12 max-w-md text-center">
                    <div className="relative mb-8">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full blur-xl opacity-50"></div>
                      <FileText className="h-16 w-16 text-blue-500 relative z-10" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">No document selected</h3>
                    <p className="text-gray-600 mb-8">
                      Pick a PDF from the sidebar to view it here.
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <FileText className="h-4 w-4" />
                      <span>Select a document to begin</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <UploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        onUploadComplete={handleUploadComplete}
      />

      <SettingsModal
        open={settingsModalOpen}
        onOpenChange={setSettingsModalOpen}
      />

      <ShareModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        documentName={selectedDocument?.name || ''}
      />

      <ProfileModal
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
        userProfile={userProfile}
        onAvatarUpload={handleAvatarUpload}
        onPasswordChangeRequest={handlePasswordChangeRequest}
        onLogout={handleLogout}
      />

      <ConfirmationModal
        open={passwordChangeConfirmOpen}
        onOpenChange={setPasswordChangeConfirmOpen}
        title="Change Password?"
        description="You will be logged out of all devices and receive a password reset link via email. This is a security measure to protect your account."
        confirmText="Continue"
        cancelText="Cancel"
        variant="warning"
        onConfirm={confirmPasswordChange}
      />

      <ConfirmationModal
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Document?"
        description={
          documentToDelete
            ? `Are you sure you want to delete "${documents.find(d => d.id === documentToDelete)?.name || 'this document'}"? This action cannot be undone and all associated chat history will be lost.`
            : "Are you sure you want to delete this document? This action cannot be undone and all associated chat history will be lost."
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
      />

      <Toaster />
    </>
  );
}
