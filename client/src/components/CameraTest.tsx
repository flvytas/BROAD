import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, AlertCircle, CheckCircle, Info } from 'lucide-react';

export default function CameraTest() {
  const [status, setStatus] = useState<string>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [permissionState, setPermissionState] = useState<string>('unknown');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(message);
  };

  const checkEnvironment = () => {
    addLog('=== Environment Check ===');
    addLog(`Protocol: ${window.location.protocol}`);
    addLog(`Hostname: ${window.location.hostname}`);
    addLog(`Origin: ${window.location.origin}`);
    addLog(`Secure Context: ${window.isSecureContext}`);
    addLog(`Navigator.mediaDevices available: ${!!navigator.mediaDevices}`);
    addLog(`getUserMedia available: ${!!navigator.mediaDevices?.getUserMedia}`);
    addLog(`User Agent: ${navigator.userAgent}`);
    
    // Detect mobile/WebView environment
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isReplit = navigator.userAgent.includes('Replit');
    const isWebView = navigator.userAgent.includes('wv');
    
    addLog(`Mobile device: ${isMobile}`);
    addLog(`Replit app: ${isReplit}`);
    addLog(`WebView context: ${isWebView}`);
    
    if (isMobile && isReplit) {
      addLog('⚠️ Detected Replit mobile app - camera permissions need OS-level access');
    }
  };

  const checkPermissions = async () => {
    try {
      addLog('=== Permission Check ===');
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
      addLog(`Permission state: ${result.state}`);
      setPermissionState(result.state);
      
      result.addEventListener('change', () => {
        addLog(`Permission changed to: ${result.state}`);
        setPermissionState(result.state);
      });
    } catch (error) {
      addLog(`Permission query failed: ${error}`);
    }
  };

  const enumerateDevices = async () => {
    try {
      addLog('=== Device Enumeration ===');
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      addLog(`Total devices: ${devices.length}`);
      addLog(`Video devices: ${videoDevices.length}`);
      
      videoDevices.forEach((device, index) => {
        addLog(`Device ${index + 1}: ${device.label || 'Unnamed'} (${device.deviceId.slice(0, 8)}...)`);
      });
      
      setDevices(videoDevices);
    } catch (error) {
      addLog(`Device enumeration failed: ${error}`);
    }
  };

  const requestCamera = async () => {
    try {
      setStatus('requesting');
      addLog('=== Camera Access Request ===');
      addLog('Requesting camera access...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: false 
      });
      
      addLog('✅ Camera access granted!');
      addLog(`Stream tracks: ${stream.getTracks().length}`);
      
      stream.getTracks().forEach((track, index) => {
        addLog(`Track ${index + 1}: ${track.kind} - ${track.label}`);
        addLog(`  Settings: ${JSON.stringify(track.getSettings())}`);
      });
      
      // Stop the stream
      stream.getTracks().forEach(track => track.stop());
      addLog('Stream stopped');
      
      setStatus('granted');
      await enumerateDevices();
      
    } catch (error: any) {
      addLog('❌ Camera access failed!');
      addLog(`Error name: ${error.name}`);
      addLog(`Error message: ${error.message}`);
      addLog(`Error details: ${JSON.stringify(error, null, 2)}`);
      setStatus('denied');
    }
  };

  const runFullTest = async () => {
    setLogs([]);
    setStatus('testing');
    
    checkEnvironment();
    await checkPermissions();
    await enumerateDevices();
    addLog('=== Full test completed ===');
    addLog('Click "Request Camera" to test permission dialog');
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'granted': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'denied': return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'requesting': return <Camera className="h-5 w-5 text-blue-600 animate-pulse" />;
      default: return <Info className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Camera Permission Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
            {getStatusIcon()}
            <span>Status: {status}</span>
            {permissionState !== 'unknown' && (
              <span className="text-sm text-gray-600">
                (Permission: {permissionState})
              </span>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button onClick={runFullTest} variant="outline">
              Run Environment Test
            </Button>
            <Button onClick={requestCamera} disabled={status === 'requesting'}>
              Request Camera Access
            </Button>
            <Button onClick={() => setLogs([])} variant="ghost" size="sm">
              Clear Logs
            </Button>
          </div>

          {devices.length > 0 && (
            <div className="p-3 bg-green-50 border border-green-200 rounded">
              <h4 className="font-medium text-green-800 mb-2">Available Cameras:</h4>
              {devices.map((device, index) => (
                <div key={device.deviceId} className="text-sm text-green-700">
                  {index + 1}. {device.label || `Camera ${device.deviceId.slice(0, 8)}...`}
                </div>
              ))}
            </div>
          )}

          <div className="border rounded p-3 bg-gray-50 max-h-60 overflow-y-auto">
            <h4 className="font-medium mb-2">Debug Logs:</h4>
            {logs.length === 0 ? (
              <p className="text-gray-500 text-sm">No logs yet. Run a test to see detailed information.</p>
            ) : (
              <div className="text-xs font-mono space-y-1">
                {logs.map((log, index) => (
                  <div key={index} className={
                    log.includes('✅') ? 'text-green-600' :
                    log.includes('❌') ? 'text-red-600' :
                    log.includes('===') ? 'font-bold text-blue-600' :
                    'text-gray-700'
                  }>
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}