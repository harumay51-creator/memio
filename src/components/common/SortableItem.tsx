import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Props {
  id: string;
  children: (props: {
    attributes: Record<string, any>;
    listeners: any;
    setNodeRef: (node: HTMLElement | null) => void;
    style: React.CSSProperties;
    isDragging: boolean;
  }) => React.ReactNode;
}

export function SortableItem({ id, children }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.3 : 1,
  };

  return <>{children({ attributes, listeners, setNodeRef, style, isDragging })}</>;
}
