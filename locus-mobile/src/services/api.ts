import {API_BASE_URL, API_ENDPOINTS} from '../utils/constants';
import type {Node, NodeDetail} from '../types';

export class ApiService {
  private static fingerprint: string = '';

  static setFingerprint(fingerprint: string) {
    this.fingerprint = fingerprint;
  }

  static async generateWidgetToken(nodeId: string): Promise<{success: boolean; data?: {widgetToken: string}; error?: string}> {
    try {
      const response = await fetch(`${API_BASE_URL}/list/widget/generate-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          fingerprint: this.fingerprint,
          nodeId,
        }),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return {success: false, error: 'Network error'};
    }
  }

  static async generateOTP(email: string): Promise<{success: boolean; error?: string}> {
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.GENERATE_OTP}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({email}),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return {success: false, error: 'Network error'};
    }
  }

  static async validateOTP(email: string, otp: string): Promise<{success: boolean; error?: string}> {
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.VALIDATE_OTP}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({email, otp, fingerprint: this.fingerprint}),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return {success: false, error: 'Network error'};
    }
  }

  static async getList(
    parentId: string = 'home',
    page: number = 1,
    limit: number = 200,
    after: number = 0,
  ): Promise<{success: boolean; data?: {nodes: Node[]; page: number; total: number; limit: number}; error?: string}> {
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.GET_LIST}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          fingerprint: this.fingerprint,
          page,
          limit,
          after,
          id: parentId,
        }),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return {success: false, error: 'Network error'};
    }
  }

  static async getNodeDetail(nodeId: string): Promise<{success: boolean; data?: NodeDetail; error?: string}> {
    try {
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.GET_NODE}/${nodeId}?fingerprint=${this.fingerprint}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        },
      );
      const data = await response.json();
      return data;
    } catch (error) {
      return {success: false, error: 'Network error'};
    }
  }

  static async searchNodes(query: string, limit: number = 50, page: number = 1): Promise<{success: boolean; data?: {nodes: Node[]}; error?: string}> {
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.SEARCH}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          fingerprint: this.fingerprint,
          query,
          limit,
          page,
        }),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return {success: false, error: 'Network error'};
    }
  }

  static async createNote(
    title: string,
    md: string,
    parentId: string = 'home',
  ): Promise<{success: boolean; data?: {url: string; node_id: string; note_id: string}; error?: string}> {
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CREATE_NOTE}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          fingerprint: this.fingerprint,
          title,
          md,
          parentId,
        }),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return {success: false, error: 'Network error'};
    }
  }

  static async getPinnedNodes(): Promise<{success: boolean; data?: {pinnedNodes: Node[]}; error?: string}> {
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.GET_PINNED}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          fingerprint: this.fingerprint,
        }),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return {success: false, error: 'Network error'};
    }
  }
}
