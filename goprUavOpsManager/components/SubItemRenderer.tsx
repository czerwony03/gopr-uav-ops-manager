import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ChecklistSubItem } from '@/types/ProcedureChecklist';
import { getAllSubItemIds } from '@/utils/checklistUtils';

interface SubItemRendererProps {
  item: ChecklistSubItem;
  depth?: number;
  cachedImageUris?: Map<string, string>;
  onImagePress?: (uri: string) => void;
  /**
   * When `true`, this item and all its nested children are forced open
   * regardless of the user's individual toggle state. Users can still
   * manually collapse/expand individual items independently.
   */
  forceExpanded?: boolean;
  /**
   * Set of sub-item ids that are marked as done. When provided, completion
   * checkboxes are rendered (execute mode).
   */
  completedSubItemIds?: Set<string>;
  /** Called when the operator toggles the done state of a sub-item. */
  onToggleSubItemDone?: (item: ChecklistSubItem) => void;
}

export default function SubItemRenderer({
  item,
  depth = 0,
  cachedImageUris,
  onImagePress,
  forceExpanded = false,
  completedSubItemIds,
  onToggleSubItemDone,
}: SubItemRendererProps) {
  const { t } = useTranslation('common');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRequiredStateExpanded, setIsRequiredStateExpanded] = useState(false);

  const isControlType = item.type === 'control';
  const hasChildren = item.subItems && item.subItems.length > 0;
  const isExpandable = hasChildren || item.content || item.control || item.image || item.link;

  // Either the user has manually expanded this item OR the parent forced it open
  const effectivelyExpanded = isExpanded || forceExpanded;

  // Completion mode is active when the parent passes completedSubItemIds
  const inCompletionMode = completedSubItemIds !== undefined;
  const isDone = inCompletionMode && completedSubItemIds!.has(item.id);

  // Auto-collapse when all children (and their descendants) are marked done
  useEffect(() => {
    if (!hasChildren || !completedSubItemIds) return;
    const allChildIds = getAllSubItemIds(item.subItems!);
    if (allChildIds.length > 0 && allChildIds.every(id => completedSubItemIds.has(id))) {
      setIsExpanded(false);
    }
  }, [completedSubItemIds, hasChildren, item.subItems]);

  const handleOpenLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('Error opening link:', error);
    }
  };

  const indentStyle = depth > 0 ? { marginLeft: depth * 16 } : undefined;

  return (
    <View style={[styles.container, indentStyle, isDone && styles.containerDone]}>
      {/* Collapsible header row */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => {
          if (isExpandable) setIsExpanded(!isExpanded);
        }}
        activeOpacity={isExpandable ? 0.7 : 1}
      >
        {isExpandable ? (
          <Ionicons
            name={effectivelyExpanded ? 'chevron-down' : 'chevron-forward'}
            size={16}
            color="#555"
            style={styles.chevron}
          />
        ) : (
          <View style={styles.chevronPlaceholder} />
        )}
        <Text style={[styles.topic, isDone && styles.topicDone]}>{item.topic}</Text>
        {/* Completion checkbox – only shown in execute mode */}
        {inCompletionMode && (
          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => onToggleSubItemDone?.(item)}
            accessibilityLabel={isDone ? t('procedures.execute.markNotDone') : t('procedures.execute.markDone')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isDone ? 'checkmark-circle' : 'ellipse-outline'}
              size={20}
              color={isDone ? '#34C759' : '#aaa'}
            />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {/* Expanded content */}
      {effectivelyExpanded && (
        <View style={styles.expandedContent}>
          {/* Image */}
          {item.image && (
            <TouchableOpacity
              activeOpacity={onImagePress ? 0.9 : 1}
              onPress={() => onImagePress?.(item.image!)}
              style={styles.imageContainer}
            >
              <Image
                source={{ uri: cachedImageUris?.get(item.image) || item.image }}
                style={styles.image}
                resizeMode="cover"
              />
            </TouchableOpacity>
          )}

          {/* Simple type: show content */}
          {!isControlType && item.content ? (
            <Text style={styles.content}>{item.content}</Text>
          ) : null}

          {/* Control type: control text (clickable to reveal requiredState) */}
          {isControlType && item.control ? (
            <TouchableOpacity
              style={styles.controlSection}
              onPress={() => setIsRequiredStateExpanded(!isRequiredStateExpanded)}
              activeOpacity={item.requiredState ? 0.7 : 1}
            >
              <View style={styles.controlLabelRow}>
                <Text style={styles.controlLabel}>{t('procedures.subItems.control')}</Text>
                {item.requiredState ? (
                  <Ionicons
                    name={isRequiredStateExpanded ? 'chevron-down' : 'chevron-forward'}
                    size={14}
                    color="#555"
                  />
                ) : null}
              </View>
              <Text style={styles.controlText}>{item.control}</Text>
            </TouchableOpacity>
          ) : null}

          {/* Control type: required state (revealed on second click) */}
          {isControlType && isRequiredStateExpanded && item.requiredState ? (
            <View style={styles.requiredStateSection}>
              <Text style={styles.requiredStateLabel}>{t('procedures.subItems.requiredState')}</Text>
              <Text style={styles.requiredStateText}>{item.requiredState}</Text>
            </View>
          ) : null}

          {/* Link */}
          {item.link ? (
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => handleOpenLink(item.link!)}
            >
              <Ionicons name="link-outline" size={14} color="#0066CC" />
              <Text style={styles.linkText}>{t('procedures.openLink')}</Text>
            </TouchableOpacity>
          ) : null}

          {/* Nested sub-items */}
          {hasChildren &&
            item.subItems!.map((child) => (
              <SubItemRenderer
                key={child.id}
                item={child}
                depth={depth + 1}
                cachedImageUris={cachedImageUris}
                onImagePress={onImagePress}
                forceExpanded={forceExpanded}
                completedSubItemIds={completedSubItemIds}
                onToggleSubItemDone={onToggleSubItemDone}
              />
            ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderLeftWidth: 2,
    borderLeftColor: '#d0d0d0',
    marginBottom: 4,
    marginLeft: 4,
  },
  containerDone: {
    borderLeftColor: '#34C759',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  chevron: {
    marginRight: 6,
  },
  chevronPlaceholder: {
    width: 22,
  },
  topic: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#222',
  },
  topicDone: {
    color: '#888',
    textDecorationLine: 'line-through',
  },
  doneButton: {
    marginLeft: 6,
  },
  expandedContent: {
    paddingLeft: 28,
    paddingBottom: 4,
  },
  imageContainer: {
    marginBottom: 8,
  },
  image: {
    width: '100%',
    height: 160,
    borderRadius: 6,
  },
  content: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
    marginBottom: 6,
  },
  controlSection: {
    backgroundColor: '#eef4ff',
    borderRadius: 6,
    padding: 10,
    marginBottom: 4,
  },
  controlLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  controlLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0055aa',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  controlText: {
    fontSize: 14,
    color: '#1a1a1a',
    lineHeight: 21,
  },
  requiredStateSection: {
    backgroundColor: '#f0fdf4',
    borderRadius: 6,
    padding: 10,
    marginBottom: 4,
  },
  requiredStateLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  requiredStateText: {
    fontSize: 14,
    color: '#1a1a1a',
    lineHeight: 21,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  linkText: {
    color: '#0066CC',
    fontSize: 14,
    marginLeft: 4,
    textDecorationLine: 'underline',
  },
});
