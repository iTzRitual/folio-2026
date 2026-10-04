"use client";

import { Component, type ReactNode } from "react";

export class SceneBoundary extends Component<{
  children: ReactNode;
  onFailure: (error: unknown) => void;
}, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    this.props.onFailure(error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
