import React, { useState, useEffect, useRef } from 'react';
import { Download, X, ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react';
import { triggerInstallPrompt, isInstalledPWA, getInstallabilityStatus, hasInstallPromptAvailable } from '../service-worker-register';
import { useTheme } from '../contexts/ThemeContext';

const PWAInstallPrompt = () => {
  const { isDark } = useTheme();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [helpMode, setHelpMode] = useState('insecure');
  const [showCertSteps, setShowCertSteps] = useState(false);
  const certTimerRef = useRef(null);

  const caDownloadUrl = `${window.location.protocol}//${window.location.hostname}:${window.location.port || (window.location.protocol === 'https:' ? '443' : '80')}/ca.crt`;

  const getCertSteps = () => {
    const ua = navigator.userAgent || '';
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isAndroid = /Android/i.test(ua);
    const isMac = /Mac/i.test(ua) && !isIOS;

    if (isIOS) return [
      '1. Tap the download link above in Safari',
      '2. Tap Allow when prompted to download',
      '3. Open Settings → General → VPN & Device Management',
      '4. Tap the NASCloud-CA certificate and then Install',
      '5. Go to Settings → General → About → Certificate Trust Settings',
      '6. Enable full trust for the NASCloud-CA certificate',
      '7. Reload this page — the install prompt will appear',
    ];
    if (isAndroid) return [
      '1. Tap the download link above',
      '2. Open Settings → Security (or Biometrics & Security)',
      '3. Tap Install from device storage / Install certificates',
      '4. Choose CA Certificate and select the downloaded file',
      '5. Confirm with your PIN/pattern',
      '6. Reload this page — the install prompt will appear',
    ];
    if (isMac) return [
      '1. Click the download link and open the file with Keychain Access',
      '2. Double-click the NASCloud-CA entry in Keychain',
      '3. Expand Trust and set SSL to Always Trust',
      '4. Close the dialog and enter your password to save',
      '5. Reload this page',
    ];
    return [
      '1. Click the download link above',
      '2. Double-click the downloaded NASCloud-CA.crt file',
      '3. Click Install Certificate → Local Machine → Next',
      '4. Select Trusted Root Certification Authorities → Finish',
      '5. Restart your browser and reload this page',
    ];
  };

  const getManualInstallText = () => {
    const ua = navigator.userAgent || '';
    if (/iPhone|iPad|iPod/i.test(ua)) return 'Tap Share (□↑), then Add to Home Screen.';
    if (/Android/i.test(ua)) return 'Tap the browser menu (⋮), then Install app or Add to Home screen.';
    return 'Open the browser menu (⋮ or ⋯) and choose Install App.';
  };

  useEffect(() => {
    if (isInstalledPWA()) { setIsInstalled(true); return; }

    const installStatus = getInstallabilityStatus();

    if (!installStatus.secureContext) {
      setHelpMode('insecure');
      setShowInstallHelp(true);
      return;
    }

    // On secure context: listen for beforeinstallprompt
    const onBeforeInstallPrompt = () => {
      clearTimeout(certTimerRef.current);
      setShowInstallHelp(false);
      setShowPrompt(true);
    };

    const onAppInstalled = () => {
      clearTimeout(certTimerRef.current);
      setShowPrompt(false);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    // If on a network IP (not localhost), the CA cert may not be trusted on this device.
    // beforeinstallprompt won't fire in that case. Show cert trust guidance after a timeout.
    if (!installStatus.isLocalhost) {
      certTimerRef.current = setTimeout(() => {
        if (!hasInstallPromptAvailable() && !isInstalledPWA()) {
          setHelpMode('cert');
          setShowInstallHelp(true);
          setShowPrompt(false);
        }
      }, 6000);
    }

    return () => {
      clearTimeout(certTimerRef.current);
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  if (!isInstalled && showInstallHelp) {
    // Certificate trust guidance — shown when HTTPS but cert not yet trusted on this device
    if (helpMode === 'cert') {
      return (
        <div
          className={`fixed bottom-4 left-4 right-4 md:max-w-sm md:bottom-6 md:left-auto md:right-6 ${
            isDark
              ? 'bg-gray-900 border border-amber-500/40 shadow-xl'
              : 'bg-white border border-amber-400/60 shadow-xl'
          } rounded-2xl p-4 md:p-5 z-50`}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <h3 className={`font-bold text-sm md:text-base ${ isDark ? 'text-white' : 'text-gray-900' }`}>
                Trust Certificate to Install
              </h3>
            </div>
            <button onClick={() => setShowInstallHelp(false)} className="flex-shrink-0 hover:opacity-70 transition-opacity" aria-label="Dismiss">
              <X className={`h-4 w-4 ${ isDark ? 'text-gray-400' : 'text-gray-500' }`} />
            </button>
          </div>

          <p className={`text-xs mb-3 ${ isDark ? 'text-gray-300' : 'text-gray-600' }`}>
            Your browser won't show the install prompt until it trusts the local HTTPS certificate.
            Download and install the CA cert on this device, then reload.
          </p>

          <a
            href={caDownloadUrl}
            download="NASCloud-CA.crt"
            className="flex items-center justify-center gap-2 w-full bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-colors mb-3"
          >
            <Download className="h-4 w-4" />
            Download NASCloud-CA.crt
          </a>

          <button
            onClick={() => setShowCertSteps(v => !v)}
            className={`flex items-center gap-1 text-xs ${ isDark ? 'text-amber-400 hover:text-amber-300' : 'text-amber-600 hover:text-amber-700' } transition-colors w-full`}
          >
            {showCertSteps ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {showCertSteps ? 'Hide steps' : 'Show installation steps for this device'}
          </button>

          {showCertSteps && (
            <ol className={`mt-2 space-y-1 text-xs ${ isDark ? 'text-gray-400' : 'text-gray-500' }`}>
              {getCertSteps().map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          )}
        </div>
      );
    }

    // Manual install guidance — shown when cert is trusted but prompt was never available
    return (
      <div
        className={`fixed bottom-4 left-4 right-4 md:max-w-md md:bottom-6 md:left-auto md:right-6 ${
          isDark
            ? 'bg-gradient-to-r from-amber-600 to-orange-600 shadow-lg'
            : 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-xl'
        } rounded-2xl p-4 md:p-6 text-white z-50`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <Download className="h-6 w-6 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-base md:text-lg mb-1">
                {helpMode === 'manual' ? 'Install from browser menu' : 'Install unavailable on HTTP'}
              </h3>
              <p className="text-sm opacity-90">
                {helpMode === 'manual'
                  ? getManualInstallText()
                  : 'Browser install prompt requires HTTPS. Use HTTPS on this IP, or open via localhost to install.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowInstallHelp(false)}
            className="flex-shrink-0 hover:opacity-80 transition-opacity"
            aria-label="Dismiss"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  if (isInstalled || !showPrompt) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-4 left-4 right-4 md:max-w-md md:bottom-6 md:left-auto md:right-6 ${
        isDark
          ? 'bg-gradient-to-r from-red-600 to-orange-600 shadow-lg'
          : 'bg-gradient-to-r from-red-500 to-orange-500 shadow-xl'
      } rounded-2xl p-4 md:p-6 text-white z-50 animate-bounce-in`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <Download className="h-6 w-6 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-bold text-base md:text-lg mb-1">Install NAS Cloud</h3>
            <p className="text-sm opacity-90">
              Install our app to access your files from any device with offline support.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowPrompt(false)}
          className="flex-shrink-0 hover:opacity-80 transition-opacity"
          aria-label="Dismiss"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={async () => {
            const result = await triggerInstallPrompt();
            if (!result?.shown) {
              setHelpMode('manual');
              setShowInstallHelp(true);
            }
          }}
          className={`flex-1 ${
            isDark
              ? 'bg-white text-red-600 hover:bg-gray-100'
              : 'bg-white text-red-500 hover:bg-gray-50'
          } font-semibold py-2 px-4 rounded-lg transition-colors`}
        >
          Install
        </button>
        <button
          onClick={() => setShowPrompt(false)}
          className="flex-1 bg-white/20 hover:bg-white/30 font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          Later
        </button>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
