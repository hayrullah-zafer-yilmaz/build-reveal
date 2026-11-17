type Listener = () => void;

let enabled = true;
const listeners = new Set<Listener>();

export function isBuildRevealEnabled() {
  return enabled;
}

export function setBuildRevealEnabled(value: boolean) {
  if (enabled === value) return;

  enabled = value;
  listeners.forEach((listener) => listener());
}

export function onBuildRevealSettingsChange(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
