import { Skeleton } from './Skeleton'

interface SkeletonTableProps {
    rows?: number
    headers?: boolean
}

export function SkeletonTable({ rows = 5, headers = true }: SkeletonTableProps) {
    return (
        <div className="w-full">
            {headers && (
                <div className="flex items-center justify-between mb-4">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-9 w-32" />
                </div>
            )}
            <div className="rounded-md border border-gray-200 bg-white">
                <div className="border-b border-gray-200 bg-gray-50 p-4">
                    <div className="flex gap-4">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-4 w-1/4" />
                    </div>
                </div>
                <div className="divide-y divide-gray-100">
                    {Array.from({ length: rows }).map((_, i) => (
                        <div key={i} className="p-4 flex gap-4">
                            <Skeleton className="h-4 w-1/4" />
                            <Skeleton className="h-4 w-1/4" />
                            <Skeleton className="h-4 w-1/4" />
                            <Skeleton className="h-4 w-1/4" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
