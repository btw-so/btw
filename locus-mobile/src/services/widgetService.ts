import {NativeModules, Platform} from 'react-native';
import type {NoteWidgetData, ChildWidgetData} from '../types';

console.log('🔍 [WidgetService] All NativeModules:', Object.keys(NativeModules));
console.log('🔍 [WidgetService] WidgetDataManager:', NativeModules.WidgetDataManager);

const {WidgetDataManager} = NativeModules;

export class WidgetService {
  /**
   * Update the Note Widget with node data
   */
  static async updateNoteWidget(
    nodeId: string,
    nodeText: string,
    widgetToken: string,
    fingerprint: string,
  ): Promise<void> {
    console.log('🟢 [WidgetService] updateNoteWidget called');
    console.log('🟢 [WidgetService] Platform:', Platform.OS);
    console.log('🟢 [WidgetService] WidgetDataManager exists:', !!WidgetDataManager);
    console.log('🟢 [WidgetService] nodeId:', nodeId);
    console.log('🟢 [WidgetService] nodeText:', nodeText);
    console.log('🟢 [WidgetService] widgetToken:', widgetToken.substring(0, 10) + '...');
    console.log('🟢 [WidgetService] fingerprint:', fingerprint);

    if (Platform.OS !== 'ios' || !WidgetDataManager) {
      console.warn('⚠️ [WidgetService] Skipping - not iOS or no native module');
      return;
    }

    try {
      console.log('🟢 [WidgetService] Calling native updateNoteWidget...');
      const result = await WidgetDataManager.updateNoteWidget(nodeId, nodeText, widgetToken, fingerprint);
      console.log('✅ [WidgetService] Native call succeeded:', result);
    } catch (error) {
      console.error('❌ [WidgetService] Failed to update note widget:', error);
      throw error;
    }
  }

  /**
   * Update the Child Widget with parent node data and widget token
   * The widget will dynamically fetch the most recent child using the token
   */
  static async updateChildWidget(
    parentNodeId: string,
    parentNodeText: string,
    widgetToken: string,
    fingerprint: string,
  ): Promise<void> {
    console.log('🟢 [WidgetService] updateChildWidget called');
    console.log('🟢 [WidgetService] parentNodeId:', parentNodeId);
    console.log('🟢 [WidgetService] parentNodeText:', parentNodeText);
    console.log('🟢 [WidgetService] widgetToken:', widgetToken.substring(0, 10) + '...');
    console.log('🟢 [WidgetService] fingerprint:', fingerprint);

    if (Platform.OS !== 'ios' || !WidgetDataManager) {
      console.warn('⚠️ [WidgetService] Skipping - not iOS or no native module');
      return;
    }

    try {
      console.log('🟢 [WidgetService] Calling native updateChildWidget...');
      const result = await WidgetDataManager.updateChildWidget(
        parentNodeId,
        parentNodeText,
        widgetToken,
        fingerprint,
      );
      console.log('✅ [WidgetService] Native call succeeded:', result);
    } catch (error) {
      console.error('❌ [WidgetService] Failed to update child widget:', error);
      throw error;
    }
  }

  /**
   * Get current Note Widget data
   */
  static async getNoteWidgetData(): Promise<NoteWidgetData | null> {
    console.log('🟢 [WidgetService] getNoteWidgetData called');

    if (Platform.OS !== 'ios' || !WidgetDataManager) {
      console.warn('⚠️ [WidgetService] Skipping - not iOS or no native module');
      return null;
    }

    try {
      console.log('🟢 [WidgetService] Calling native getNoteWidgetData...');
      const data = await WidgetDataManager.getNoteWidgetData();
      console.log('✅ [WidgetService] Got data:', data);
      return data || null;
    } catch (error) {
      console.error('❌ [WidgetService] Failed to get note widget data:', error);
      return null;
    }
  }

  /**
   * Get current Child Widget data
   */
  static async getChildWidgetData(): Promise<ChildWidgetData | null> {
    console.log('🟢 [WidgetService] getChildWidgetData called');

    if (Platform.OS !== 'ios' || !WidgetDataManager) {
      console.warn('⚠️ [WidgetService] Skipping - not iOS or no native module');
      return null;
    }

    try {
      console.log('🟢 [WidgetService] Calling native getChildWidgetData...');
      const data = await WidgetDataManager.getChildWidgetData();
      console.log('✅ [WidgetService] Got child widget data:', data);
      return data || null;
    } catch (error) {
      console.error('❌ [WidgetService] Failed to get child widget data:', error);
      return null;
    }
  }

  /**
   * Clear Note Widget data
   */
  static async clearNoteWidget(): Promise<void> {
    if (Platform.OS !== 'ios' || !WidgetDataManager) {
      return;
    }

    try {
      await WidgetDataManager.clearNoteWidget();
    } catch (error) {
      console.error('Failed to clear note widget:', error);
      throw error;
    }
  }

  /**
   * Clear Child Widget data
   */
  static async clearChildWidget(): Promise<void> {
    if (Platform.OS !== 'ios' || !WidgetDataManager) {
      return;
    }

    try {
      await WidgetDataManager.clearChildWidget();
    } catch (error) {
      console.error('Failed to clear child widget:', error);
      throw error;
    }
  }
}
