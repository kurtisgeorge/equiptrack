import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { RefreshCw } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Select } from '../../../components/ui/select'
import { Textarea } from '../../../components/ui/textarea'
import type { CreateEquipmentDTO, Equipment, EquipmentStatus } from '../../../types/equipment'

const dateCls =
  'w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100'

const NEW_CATEGORY_SENTINEL = '__new_category__'

const schema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.'),
  category: z.string().trim().min(2, 'Category is required.'),
  status: z.enum(['available', 'in_use', 'maintenance']),
  qrCode: z.string().trim().min(2, 'QR code is required.'),
  lastServiceDate: z.string().min(1, 'Last service date is required.'),
  nextServiceDueDate: z.string().optional(),
  maintenanceIntervalDays: z.string().optional(),
  notes: z.string().max(500, 'Notes must be under 500 characters.').optional(),
})

type EquipmentFormValues = z.infer<typeof schema>

type EquipmentFormProps = {
  initialValues?: Partial<Equipment>
  existingEquipment?: Equipment[]
  isSubmitting?: boolean
  submitLabel: string
  onSubmit: (values: CreateEquipmentDTO) => void
  onCancel?: () => void
}

const statusOptions: Array<{ label: string; value: EquipmentStatus }> = [
  { label: 'Available',    value: 'available'   },
  { label: 'In Use',       value: 'in_use'      },
  { label: 'Maintenance',  value: 'maintenance' },
]

function derivePrefix(category: string): string {
  const cleaned = category.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  return cleaned.slice(0, 6) || 'EQP'
}

function nextAssetTag(prefix: string, existing: Equipment[]): string {
  const pattern = new RegExp(`^${prefix}-(\\d+)$`, 'i')
  const numbers = existing
    .map((eq) => pattern.exec(eq.qrCode ?? ''))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => parseInt(m[1], 10))
    .filter((n) => Number.isFinite(n))
  const next = numbers.length > 0 ? Math.max(...numbers) + 1 : 1
  return `${prefix}-${String(next).padStart(3, '0')}`
}

export default function EquipmentForm({
  initialValues,
  existingEquipment = [],
  isSubmitting,
  submitLabel,
  onSubmit,
  onCancel,
}: EquipmentFormProps) {
  const isEditMode = Boolean(initialValues?.id)

  const existingCategories = useMemo(() => {
    const set = new Set<string>()
    existingEquipment.forEach((eq) => {
      if (eq.category && eq.category.trim().length > 0) set.add(eq.category.trim())
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [existingEquipment])

  const initialCategory = initialValues?.category ?? ''
  const initialCategoryIsExisting =
    initialCategory.length > 0 && existingCategories.includes(initialCategory)

  // When editing an existing-category record, we start in "dropdown" mode;
  // in all other cases we default to dropdown when there ARE categories,
  // or free-text when none exist yet.
  const [categoryMode, setCategoryMode] = useState<'select' | 'new'>(() => {
    if (!isEditMode && existingCategories.length === 0) return 'new'
    if (initialCategory.length > 0 && !initialCategoryIsExisting) return 'new'
    return 'select'
  })

  const form = useForm<EquipmentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initialValues?.name ?? '',
      category: initialCategory,
      status: initialValues?.status ?? 'available',
      qrCode: initialValues?.qrCode ?? '',
      lastServiceDate: initialValues?.lastServiceDate ?? '',
      nextServiceDueDate: initialValues?.nextServiceDueDate ?? '',
      maintenanceIntervalDays:
        initialValues?.maintenanceIntervalDays !== undefined
          ? String(initialValues.maintenanceIntervalDays)
          : '',
      notes: initialValues?.notes ?? '',
    },
  })

  const categoryValue = form.watch('category')
  const qrCodeValue = form.watch('qrCode')

  // Auto-generate an asset tag in create mode whenever the category changes,
  // but only if the user hasn't typed anything custom into qrCode yet.
  const [tagTouched, setTagTouched] = useState<boolean>(Boolean(initialValues?.qrCode))
  useEffect(() => {
    if (isEditMode) return
    if (tagTouched) return
    if (!categoryValue || categoryValue.trim().length < 2) return
    const nextTag = nextAssetTag(derivePrefix(categoryValue), existingEquipment)
    form.setValue('qrCode', nextTag, { shouldValidate: false, shouldDirty: false })
  }, [categoryValue, existingEquipment, form, isEditMode, tagTouched])

  const handleRegenerateTag = () => {
    if (!categoryValue || categoryValue.trim().length < 2) return
    const nextTag = nextAssetTag(derivePrefix(categoryValue), existingEquipment)
    form.setValue('qrCode', nextTag, { shouldValidate: true, shouldDirty: true })
    setTagTouched(false)
  }

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit((values) =>
        onSubmit({
          ...values,
          category: values.category.trim(),
          qrCode: values.qrCode.trim(),
          nextServiceDueDate: values.nextServiceDueDate || undefined,
          maintenanceIntervalDays:
            values.maintenanceIntervalDays && values.maintenanceIntervalDays.trim().length > 0
              ? Number(values.maintenanceIntervalDays)
              : undefined,
          notes: values.notes || undefined,
        }),
      )}
    >
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" {...form.register('name')} />
        {form.formState.errors.name && (
          <p className="text-xs text-red-600">{form.formState.errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        {categoryMode === 'select' && existingCategories.length > 0 ? (
          <>
            <Select
              id="category"
              value={existingCategories.includes(categoryValue) ? categoryValue : ''}
              onChange={(e) => {
                const value = e.target.value
                if (value === NEW_CATEGORY_SENTINEL) {
                  setCategoryMode('new')
                  form.setValue('category', '', { shouldValidate: true, shouldDirty: true })
                  return
                }
                form.setValue('category', value, { shouldValidate: true, shouldDirty: true })
              }}
            >
              <option value="" disabled>
                Select a category…
              </option>
              {existingCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
              <option value={NEW_CATEGORY_SENTINEL}>+ Add new category…</option>
            </Select>
            <p className="text-xs text-slate-400">
              Pick from existing categories to keep data consistent.
            </p>
          </>
        ) : (
          <>
            <Input
              id="category"
              placeholder="e.g. Earthmoving"
              {...form.register('category')}
            />
            {existingCategories.length > 0 && (
              <button
                type="button"
                className="text-xs text-blue-600 hover:underline"
                onClick={() => {
                  setCategoryMode('select')
                  form.setValue('category', '', { shouldValidate: true, shouldDirty: true })
                }}
              >
                ← Pick an existing category instead
              </button>
            )}
          </>
        )}
        {form.formState.errors.category && (
          <p className="text-xs text-red-600">{form.formState.errors.category.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select id="status" {...form.register('status')}>
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="qrCode">QR Code / Asset Tag</Label>
        <div className="flex items-center gap-2">
          <Input
            id="qrCode"
            placeholder={categoryValue ? nextAssetTag(derivePrefix(categoryValue), existingEquipment) : 'Select a category first'}
            value={qrCodeValue}
            onChange={(e) => {
              setTagTouched(true)
              form.setValue('qrCode', e.target.value, { shouldValidate: true, shouldDirty: true })
            }}
          />
          {!isEditMode && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleRegenerateTag}
              disabled={!categoryValue || categoryValue.trim().length < 2}
              className="gap-1.5 shrink-0"
              title="Regenerate from category"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Auto
            </Button>
          )}
        </div>
        <p className="text-xs text-slate-400">
          {isEditMode
            ? 'Changing the asset tag will update any printed QR labels.'
            : 'Auto-generated from the category. You can edit it, or click Auto to regenerate.'}
        </p>
        {form.formState.errors.qrCode && (
          <p className="text-xs text-red-600">{form.formState.errors.qrCode.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="lastServiceDate">Last Service Date</Label>
        <input
          id="lastServiceDate"
          type="date"
          className={dateCls}
          {...form.register('lastServiceDate')}
        />
        {form.formState.errors.lastServiceDate && (
          <p className="text-xs text-red-600">{form.formState.errors.lastServiceDate.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="nextServiceDueDate">Next Service Due Date</Label>
        <input
          id="nextServiceDueDate"
          type="date"
          className={dateCls}
          {...form.register('nextServiceDueDate')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="maintenanceIntervalDays">Maintenance Interval (days)</Label>
        <Input id="maintenanceIntervalDays" min={1} type="number" {...form.register('maintenanceIntervalDays')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" placeholder="Optional notes" {...form.register('notes')} />
        {form.formState.errors.notes && (
          <p className="text-xs text-red-600">{form.formState.errors.notes.message}</p>
        )}
      </div>

      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <Button onClick={onCancel} type="button" variant="secondary">
            Cancel
          </Button>
        )}
        <Button disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
