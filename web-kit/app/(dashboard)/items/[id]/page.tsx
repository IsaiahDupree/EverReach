'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useItem, useDeleteItem } from '@/hooks/use-items';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

/**
 * Item Detail Page Component
 *
 * Displays detailed information about a specific item with edit and delete actions.
 *
 * Features:
 * - View item details (title, description, timestamps)
 * - Edit button to navigate to edit page
 * - Delete button with confirmation dialog
 * - Back navigation
 * - Loading and error states
 *
 * Acceptance Criteria (WEB-PAGE-005):
 * - Show item details
 * - Edit/delete actions
 */
export default function ItemDetailPage() {
  const router = useRouter();
  const params = useParams();
  const itemId = params?.id as string;

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Fetch item data
  const { data: item, isLoading, error } = useItem(itemId);

  // Delete mutation
  const { mutate: deleteItem, isPending: isDeleting } = useDeleteItem();

  // Handle delete action
  const handleDelete = () => {
    deleteItem(itemId, {
      onSuccess: () => {
        router.push('/items');
      },
    });
  };

  // Format date helper
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return new Date(dateString).toLocaleDateString();
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col gap-8 p-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
            <p className="text-muted-foreground">Loading item...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !item) {
    return (
      <div className="flex flex-col gap-8 p-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center text-red-600">
            <p className="font-semibold">Error loading item</p>
            <p className="text-sm mt-1">
              {error instanceof Error ? error.message : 'Item not found'}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push('/items')}
            >
              Back to Items
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-8" data-testid="item-detail-page">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/items/${itemId}/edit`)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the item
                  &quot;{item.title}&quot;.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? 'Deleting...' : 'Confirm'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Item Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{item.title}</CardTitle>
          <CardDescription>
            Item ID: {item.id}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Description Section */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Description</h3>
            <p className="text-base">
              {item.description || 'No description provided'}
            </p>
          </div>

          {/* Metadata Section */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Created</h3>
              <p className="text-sm">{formatDate(item.created_at)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(item.created_at).toLocaleString()}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Updated</h3>
              <p className="text-sm">{formatDate(item.updated_at)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(item.updated_at).toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
