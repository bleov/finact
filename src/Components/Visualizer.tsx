import React, { useContext, useEffect, useRef } from "react";
import { GlobalState } from "../App";

const canvasStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0
};

export function isButterchurnSupported() {
  let gl = null;

  try {
    const canvas = document.createElement("canvas");
    gl = canvas.getContext("webgl2");
  } catch {
    gl = null;
  }

  const hasWebGL2 = !!gl;

  const hasAudioContext = typeof window.AudioContext !== "undefined" || typeof window.webkitAudioContext !== "undefined";

  return hasWebGL2 && hasAudioContext;
}

export default function Visualizer(props) {
  const { setLoading } = useContext(GlobalState);

  const canvasRef = useRef(null);
  const presetIndex = useRef(0);
  const visualizerRef = useRef<any>(null);

  let presets = useRef<any>(null);

  useEffect(() => {
    const audioContext = props.audioContextRef.current;
    const gainNode = props.gainNodeRef.current;
    let closing = false;
    setLoading(true);
    async function setup() {
      const butterchurn = (await import("butterchurn")).default.default;
      const butterchurnPresets = (await import("butterchurn-presets")).default;
      presets.current = butterchurnPresets.getPresets();

      const visualizer = butterchurn.createVisualizer(audioContext, canvasRef.current, {
        width: window.innerWidth,
        height: window.innerHeight,
        pixelRatio: window.devicePixelRatio || 1,
        textureRatio: 1
      });
      visualizerRef.current = visualizer;

      visualizer.connectAudio(gainNode);

      visualizer.loadPreset(Object.values(presets.current)[0]);

      setLoading(false);
      function render() {
        visualizer.render();

        if (closing) {
          return;
        }

        requestAnimationFrame(render);
      }

      render();
    }

    setup();

    return () => {
      closing = true;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={window.innerWidth}
      height={window.innerHeight}
      style={canvasStyle}
      onClick={() => {
        if (!presets.current || !visualizerRef.current) {
          return;
        }
        if (presetIndex.current >= Object.values(presets.current).length) {
          presetIndex.current = 0;
        }

        visualizerRef.current.loadPreset(Object.values(presets.current)[presetIndex.current]);
        presetIndex.current++;
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        if (!presets.current || !visualizerRef.current) {
          return;
        }
        if (presetIndex.current <= 0) {
          presetIndex.current = Object.values(presets.current).length - 1;
        } else {
          presetIndex.current--;
        }

        visualizerRef.current.loadPreset(Object.values(presets.current)[presetIndex.current]);
      }}
    ></canvas>
  );
}
