import React, { useState, useEffect } from 'react';
import { Settings, Bot, Zap, Lock, Bell, Sparkles, Layers, Brain } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Slider } from './ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Separator } from './ui/separator';
import { toast } from 'sonner@2.0.3';
import { TokenManager } from '../services/api';
import { getUserSettings, updateUserSettings, applySettings } from '../services/settings';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AIModel {
  id: string;
  model_string: string;
  name: string;
  description: string;
  category: string;
  max_tokens: number;
  recommended_temperature: number;
  icon: string;
  is_default: boolean;
  features: string[];
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const [aiModels, setAiModels] = useState<AIModel[]>([]);
  const [aiModel, setAiModel] = useState('standard');
  const [temperature, setTemperature] = useState([0.7]);
  const [contextLength, setContextLength] = useState('8192');
  const [autoSave, setAutoSave] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [pageReferences, setPageReferences] = useState(true);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch available AI models from backend
  useEffect(() => {
    const fetchModels = async () => {
      setLoadingModels(true);
      try {
        const token = TokenManager.getAccessToken();
        console.log('🔑 Fetching models with token:', token ? 'Token exists' : 'No token found');
        
        if (!token) {
          console.error('❌ No access token found');
          toast.error('Please log in to view model settings');
          setLoadingModels(false);
          return;
        }
        
        const response = await fetch('http://localhost:8000/api/rag/models/', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('📡 Models API response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Models fetched successfully:', data);
          setAiModels(data.models || []);
          if (data.default_category) {
            setAiModel(data.default_category);
          }
        } else if (response.status === 401) {
          console.error('❌ 401 Unauthorized - Token might be invalid');
          const errorData = await response.json().catch(() => ({}));
          console.error('Error details:', errorData);
          toast.error('Session expired. Please log in again.');
        } else {
          console.error('❌ Failed to fetch models:', response.status);
          toast.error('Failed to load AI models');
        }
      } catch (error) {
        console.error('❌ Exception while fetching models:', error);
        toast.error('Failed to load AI models');
      } finally {
        setLoadingModels(false);
      }
    };
    
    if (open) {
      fetchModels();
    }
  }, [open]);

  // Load user settings from backend
  useEffect(() => {
    const loadSettings = async () => {
      if (!open) return;
      
      setLoadingSettings(true);
      try {
        const settings = await getUserSettings();
        
        // Apply settings to UI
        setAiModel(settings.ai_model);
        setTemperature([settings.temperature]);
        setContextLength(settings.context_length.toString());
        setAutoSave(settings.auto_save);
        setPageReferences(settings.page_references);
        setNotifications(settings.notifications);
        setDarkMode(settings.dark_mode);
        
        console.log('✅ Settings loaded successfully:', settings);
      } catch (error: any) {
        console.error('❌ Error loading settings:', error);
        toast.error(error.message || 'Failed to load settings');
      } finally {
        setLoadingSettings(false);
      }
    };
    
    loadSettings();
  }, [open]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedSettings = await updateUserSettings({
        ai_model: aiModel,
        temperature: temperature[0],
        context_length: parseInt(contextLength),
        auto_save: autoSave,
        page_references: pageReferences,
        notifications: notifications,
        dark_mode: darkMode
      });
      
      // Apply settings to the app (e.g., dark mode)
      applySettings(updatedSettings);
      
      toast.success('Settings saved successfully!');
      onOpenChange(false);
    } catch (error: any) {
      console.error('❌ Error saving settings:', error);
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      // Reset to default values
      const defaultSettings = {
        ai_model: 'standard',
        temperature: 0.7,
        context_length: 4000,
        auto_save: true,
        page_references: true,
        notifications: true,
        dark_mode: false
      };
      
      // Update on backend
      const updatedSettings = await updateUserSettings(defaultSettings);
      
      // Apply to UI
      setAiModel(updatedSettings.ai_model);
      setTemperature([updatedSettings.temperature]);
      setContextLength(updatedSettings.context_length.toString());
      setAutoSave(updatedSettings.auto_save);
      setPageReferences(updatedSettings.page_references);
      setNotifications(updatedSettings.notifications);
      setDarkMode(updatedSettings.dark_mode);
      
      // Apply to app
      applySettings(updatedSettings);
      
      toast.info('Settings reset to defaults');
    } catch (error: any) {
      console.error('❌ Error resetting settings:', error);
      toast.error(error.message || 'Failed to reset settings');
    }
  };

  const getModelIcon = (iconName: string) => {
    switch (iconName) {
      case 'zap':
        return <Zap className="h-4 w-4" />;
      case 'layers':
        return <Layers className="h-4 w-4" />;
      case 'brain':
        return <Brain className="h-4 w-4" />;
      default:
        return <Sparkles className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Settings
          </DialogTitle>
          <DialogDescription>
            Customize your DocChat AI experience
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="ai" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              AI Settings
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Preferences
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Privacy
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ai" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ai-model">AI Model</Label>
                <Select value={aiModel} onValueChange={setAiModel} disabled={loadingModels}>
                  <SelectTrigger id="ai-model">
                    <SelectValue placeholder={loadingModels ? "Loading models..." : "Select model"} />
                  </SelectTrigger>
                  <SelectContent>
                    {aiModels.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        <div className="flex items-center gap-2">
                          {getModelIcon(model.icon)}
                          <div>
                            <div className="font-medium">{model.name}</div>
                            <div className="text-xs text-gray-500">{model.description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {aiModel && aiModels.find(m => m.id === aiModel) && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-md text-xs space-y-1">
                    <p className="font-medium text-gray-700">Features:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-gray-600">
                      {aiModels.find(m => m.id === aiModel)?.features.map((feature, idx) => (
                        <li key={idx}>{feature}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  Choose the AI model for document analysis
                </p>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="temperature">Response Creativity</Label>
                  <span className="text-sm text-gray-500">{temperature[0].toFixed(1)}</span>
                </div>
                <Slider
                  id="temperature"
                  min={0}
                  max={1}
                  step={0.1}
                  value={temperature}
                  onValueChange={setTemperature}
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>More Precise</span>
                  <span>More Creative</span>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="context">Context Length</Label>
                <Select 
                  value={contextLength} 
                  onValueChange={setContextLength}
                  disabled={!aiModel || loadingModels}
                >
                  <SelectTrigger id="context">
                    <SelectValue placeholder="Select context length" />
                  </SelectTrigger>
                  <SelectContent>
                    {aiModel && aiModels.find(m => m.id === aiModel) && (
                      <>
                        <SelectItem value={(aiModels.find(m => m.id === aiModel)!.max_tokens / 4).toString()}>
                          {(aiModels.find(m => m.id === aiModel)!.max_tokens / 4).toLocaleString()} tokens (Faster)
                        </SelectItem>
                        <SelectItem value={(aiModels.find(m => m.id === aiModel)!.max_tokens / 2).toString()}>
                          {(aiModels.find(m => m.id === aiModel)!.max_tokens / 2).toLocaleString()} tokens (Balanced)
                        </SelectItem>
                        <SelectItem value={aiModels.find(m => m.id === aiModel)!.max_tokens.toString()}>
                          {aiModels.find(m => m.id === aiModel)!.max_tokens.toLocaleString()} tokens (Maximum)
                        </SelectItem>
                      </>
                    )}
                    {(!aiModel || !aiModels.find(m => m.id === aiModel)) && (
                      <SelectItem value="8192">8,192 tokens (Default)</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Larger context allows longer conversations
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-6 mt-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-save">Auto-save Conversations</Label>
                  <p className="text-xs text-gray-500">
                    Automatically save chat history
                  </p>
                </div>
                <Switch
                  id="auto-save"
                  checked={autoSave}
                  onCheckedChange={setAutoSave}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notifications" className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Notifications
                  </Label>
                  <p className="text-xs text-gray-500">
                    Get notified about processing updates
                  </p>
                </div>
                <Switch
                  id="notifications"
                  checked={notifications}
                  onCheckedChange={setNotifications}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="dark-mode">Dark Mode</Label>
                  <p className="text-xs text-gray-500">
                    Switch to dark theme
                  </p>
                </div>
                <Switch
                  id="dark-mode"
                  checked={darkMode}
                  onCheckedChange={setDarkMode}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="page-refs">Show Page References</Label>
                  <p className="text-xs text-gray-500">
                    Display clickable page numbers in responses
                  </p>
                </div>
                <Switch
                  id="page-refs"
                  checked={pageReferences}
                  onCheckedChange={setPageReferences}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-6 mt-6">
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-blue-600" />
                  <div>
                    <h4 className="text-sm">Data Privacy</h4>
                    <p className="text-xs text-gray-500">
                      Your documents are encrypted and never shared
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm text-blue-900 mb-2">Security Features</h4>
                  <ul className="space-y-2 text-xs text-blue-800">
                    <li className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 bg-blue-600 rounded-full" />
                      End-to-end encryption for all documents
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 bg-blue-600 rounded-full" />
                      Automatic data deletion after 30 days
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 bg-blue-600 rounded-full" />
                      GDPR compliant data processing
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 bg-blue-600 rounded-full" />
                      No third-party data sharing
                    </li>
                  </ul>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    Download My Data
                  </Button>
                  <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700">
                    Delete All My Data
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={handleReset}
            disabled={saving || loadingSettings}
          >
            Reset to Defaults
          </Button>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={saving || loadingSettings}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
