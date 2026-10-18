'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useItems } from '@/hooks/use-items';
import { Plus, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

/**
 * Items List Page Component
 *
 * Displays a paginated list of items in a data table with create functionality.
 *
 * Features:
 * - Data table displaying all items
 * - Pagination support
 * - Create button for adding new items
 * - Click row to view item details
 * - Loading and error states
 * - Empty state for no items
 *
 * Acceptance Criteria (WEB-PAGE-004):
 * - Data table
 * - Pagination
 * - Create button
 */
export default function ItemsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Fetch items with pagination
  const { data, isLoading, error } = useItems({ page, limit: pageSize });

  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  // Handle row click to navigate to item detail
  const handleRowClick = (itemId: string) => {
    router.push(`/items/${itemId}`);
  };

  // Format date helper
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="flex flex-col gap-8 p-8" data-testid="items-page">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Items</h1>
          <p className="text-muted-foreground">
            Manage your items and track your data
          </p>
        </div>
        <Button asChild>
          <Link href="/items/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Item
          </Link>
        </Button>
      </div>

      {/* Items Table Card */}
      <Card>
        <CardHeader>
          <CardTitle>All Items</CardTitle>
          <CardDescription>
            {total > 0 ? `Showing ${items.length} of ${total} items` : 'No items yet'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
                <p className="text-muted-foreground">Loading items...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center text-red-600">
                <p className="font-semibold">Error loading items</p>
                <p className="text-sm mt-1">
                  {error instanceof Error ? error.message : 'Failed to fetch items'}
                </p>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="mx-auto h-12 w-12 mb-4 opacity-50 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-1">No items found</h3>
              <p className="text-muted-foreground mb-4">
                Get started by creating your first item
              </p>
              <Button asChild>
                <Link href="/items/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Item
                </Link>
              </Button>
            </div>
          )}

          {/* Data Table */}
          {!isLoading && !error && items.length > 0 && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer"
                      onClick={() => handleRowClick(item.id)}
                      role="row"
                      aria-label={`${item.title} ${item.description || ''}`}
                    >
                      <TableCell className="font-medium">{item.title}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.description || 'No description'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(item.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/items/${item.id}`);
                          }}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <nav
                  className="flex items-center justify-between border-t pt-4 mt-4"
                  aria-label="Pagination"
                  role="navigation"
                >
                  <div className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </nav>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
