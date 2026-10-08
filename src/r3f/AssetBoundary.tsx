/**
 * AssetBoundary — React ErrorBoundary for 3D asset groups.
 *
 * Catches errors thrown inside its child tree (typically by useGLTF /
 * useLoader / useFBX when a model URL 404s or a corrupt GLB fails to
 * parse). Renders null on error + logs a console.warn so the rest of
 * the scene keeps rendering instead of unmounting the whole <Canvas>.
 *
 * Usage (in StreetCanvas.tsx):
 *   <AssetBoundary>
 *     <Suspense fallback={null}>
 *       <MarketStalls />
 *     </Suspense>
 *   </AssetBoundary>
 *
 * Critical for the GitHub Pages deploy: if ONE model fails to load,
 * only that group fails — roads, blocks, the city grid (procedural,
 * no files), and other asset groups keep rendering. Without this
 * boundary, React unmounts the whole Canvas tree on the first 404.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { recordAssetFailure } from '../debug/DebugOverlay';

export interface AssetBoundaryProps {
  children: ReactNode;
  /** Optional name for the asset group — used in the warn log so devs
   *  can identify which group failed in a sea of console output. */
  name?: string;
}

interface AssetBoundaryState {
  hasError: boolean;
}

export class AssetBoundary extends Component<AssetBoundaryProps, AssetBoundaryState> {
  constructor(props: AssetBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): AssetBoundaryState {
    // Update state so the next render shows the fallback (null).
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    recordAssetFailure(this.props.name ?? 'unnamed', error.message);
    // eslint-disable-next-line no-console
    console.warn(
      `[asset] failed${this.props.name ? ` (${this.props.name})` : ''}:`,
      error,
      errorInfo
    );
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}
