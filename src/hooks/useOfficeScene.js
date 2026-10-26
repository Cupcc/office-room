import { useEffect, useRef, useState } from 'react';
import { OfficeScene } from '../scene.js';

// React owns interface state; the scene owns WebGL objects and pointer gestures.
export function useOfficeScene(containerRef, callbacks) {
  const sceneRef = useRef(null);
  const [status, setStatus] = useState('loading');
  useEffect(() => {
    let scene;
    try {
      scene = new OfficeScene(containerRef.current, callbacks);
      sceneRef.current = scene;
      setStatus('ready');
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
    return () => {
      scene?.dispose();
      sceneRef.current = null;
    };
  }, [containerRef, callbacks]);
  return { sceneRef, status };
}
