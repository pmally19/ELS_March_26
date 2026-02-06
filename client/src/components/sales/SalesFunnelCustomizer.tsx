import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Save, 
  RotateCcw, 
  Plus, 
  Minus, 
  Eye, 
  EyeOff,
  GripVertical,
  Trash2
} from 'lucide-react';

interface FunnelStageConfig {
  id: string;
  name: string;
  enabled: boolean;
  color: string;
  order: number;
  showCount: boolean;
  showValue: boolean;
  showConversion: boolean;
}

interface SalesFunnelCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: FunnelStageConfig[]) => void;
}

const SalesFunnelCustomizer: React.FC<SalesFunnelCustomizerProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const [stages, setStages] = useState<FunnelStageConfig[]>([
    {
      id: 'leads',
      name: 'Leads',
      enabled: true,
      color: 'bg-blue-500',
      order: 1,
      showCount: true,
      showValue: true,
      showConversion: false
    },
    {
      id: 'opportunities',
      name: 'Opportunities',
      enabled: true,
      color: 'bg-green-500',
      order: 2,
      showCount: true,
      showValue: true,
      showConversion: true
    },
    {
      id: 'quotes',
      name: 'Quotes',
      enabled: true,
      color: 'bg-yellow-500',
      order: 3,
      showCount: true,
      showValue: true,
      showConversion: true
    },
    {
      id: 'orders',
      name: 'Orders',
      enabled: true,
      color: 'bg-purple-500',
      order: 4,
      showCount: true,
      showValue: true,
      showConversion: true
    },
    {
      id: 'revenue',
      name: 'Revenue',
      enabled: true,
      color: 'bg-emerald-500',
      order: 5,
      showCount: true,
      showValue: true,
      showConversion: false
    }
  ]);

  const [newStageName, setNewStageName] = useState('');

  const colorOptions = [
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-emerald-500',
    'bg-red-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500'
  ];

  const updateStage = (id: string, updates: Partial<FunnelStageConfig>) => {
    setStages(prev => prev.map(stage => 
      stage.id === id ? { ...stage, ...updates } : stage
    ));
  };

  const addStage = () => {
    if (!newStageName.trim()) return;
    
    const newStage: FunnelStageConfig = {
      id: newStageName.toLowerCase().replace(/\s+/g, '-'),
      name: newStageName,
      enabled: true,
      color: 'bg-gray-500',
      order: stages.length + 1,
      showCount: true,
      showValue: true,
      showConversion: true
    };
    
    setStages(prev => [...prev, newStage]);
    setNewStageName('');
  };

  const removeStage = (id: string) => {
    setStages(prev => prev.filter(stage => stage.id !== id));
  };

  const moveStage = (id: string, direction: 'up' | 'down') => {
    const currentIndex = stages.findIndex(stage => stage.id === id);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= stages.length) return;
    
    const newStages = [...stages];
    [newStages[currentIndex], newStages[newIndex]] = [newStages[newIndex], newStages[currentIndex]];
    
    // Update order numbers
    newStages.forEach((stage, index) => {
      stage.order = index + 1;
    });
    
    setStages(newStages);
  };

  const resetToDefault = () => {
    setStages([
      { id: 'leads', name: 'Leads', enabled: true, color: 'bg-blue-500', order: 1, showCount: true, showValue: true, showConversion: false },
      { id: 'opportunities', name: 'Opportunities', enabled: true, color: 'bg-green-500', order: 2, showCount: true, showValue: true, showConversion: true },
      { id: 'quotes', name: 'Quotes', enabled: true, color: 'bg-yellow-500', order: 3, showCount: true, showValue: true, showConversion: true },
      { id: 'orders', name: 'Orders', enabled: true, color: 'bg-purple-500', order: 4, showCount: true, showValue: true, showConversion: true },
      { id: 'revenue', name: 'Revenue', enabled: true, color: 'bg-emerald-500', order: 5, showCount: true, showValue: true, showConversion: false }
    ]);
  };

  const handleSave = () => {
    const enabledStages = stages.filter(stage => stage.enabled).sort((a, b) => a.order - b.order);
    onSave(enabledStages);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <Card className="border-0 shadow-none">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Customize Sales Funnel
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={onClose}>
                ×
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Add New Stage */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="font-semibold mb-3">Add New Stage</h4>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter stage name"
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addStage()}
                />
                <Button onClick={addStage} disabled={!newStageName.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Existing Stages */}
            <div className="space-y-4">
              <h4 className="font-semibold">Configure Stages</h4>
              {stages.map((stage, index) => (
                <div key={stage.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveStage(stage.id, 'up')}
                          disabled={index === 0}
                        >
                          <GripVertical className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className={`w-4 h-4 rounded ${stage.color}`}></div>
                      <div>
                        <Input
                          value={stage.name}
                          onChange={(e) => updateStage(stage.id, { name: e.target.value })}
                          className="font-semibold"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={stage.enabled}
                        onCheckedChange={(enabled) => updateStage(stage.id, { enabled })}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStage(stage.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {stage.enabled && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Color Selection */}
                      <div>
                        <Label className="text-xs text-gray-600">Color</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {colorOptions.map(color => (
                            <button
                              key={color}
                              className={`w-6 h-6 rounded ${color} border-2 ${
                                stage.color === color ? 'border-gray-800' : 'border-gray-300'
                              }`}
                              onClick={() => updateStage(stage.id, { color })}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Display Options */}
                      <div>
                        <Label className="text-xs text-gray-600">Show Count</Label>
                        <div className="mt-1">
                          <Switch
                            checked={stage.showCount}
                            onCheckedChange={(showCount) => updateStage(stage.id, { showCount })}
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs text-gray-600">Show Value</Label>
                        <div className="mt-1">
                          <Switch
                            checked={stage.showValue}
                            onCheckedChange={(showValue) => updateStage(stage.id, { showValue })}
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs text-gray-600">Show Conversion</Label>
                        <div className="mt-1">
                          <Switch
                            checked={stage.showConversion}
                            onCheckedChange={(showConversion) => updateStage(stage.id, { showConversion })}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button variant="outline" onClick={resetToDefault} className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4" />
                Reset to Default
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handleSave} className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Save Configuration
                </Button>
              </div>
            </div>

            {/* Preview */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold mb-3">Preview</h4>
              <div className="text-sm text-gray-600">
                Active Stages: {stages.filter(s => s.enabled).length} of {stages.length}
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {stages
                  .filter(s => s.enabled)
                  .sort((a, b) => a.order - b.order)
                  .map(stage => (
                    <Badge key={stage.id} variant="outline" className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded ${stage.color}`}></div>
                      {stage.name}
                    </Badge>
                  ))
                }
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SalesFunnelCustomizer;