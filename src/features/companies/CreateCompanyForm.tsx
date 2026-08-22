import { useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { LogoPicker } from './LogoPicker'
import { deriveSlug, deriveInitials, cn } from '@/lib/utils'
import { useCreateCompany, isUniqueViolation } from './useCreateCompany'
import { useUploadCompanyLogo } from './useCompanyLogo'
import { useSetCompanyCategory } from './useCompanyCategory'
import { useCategories } from '@/lib/supabase/hooks'

const LOGO_COLORS = ['#6C5CE7', '#00B4D8', '#FB8500', '#F72585', '#06D6A0', '#3A86FF', '#FF006E', '#38B000']
const CURRENT_YEAR = new Date().getFullYear()

interface FormValues {
  name: string
  tagline: string
  description: string
  website: string
  foundedYear: string
  categoryId: string
}

type FormErrors = Partial<Record<keyof FormValues, string>>

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {}
  if (values.name.trim().length < 2) errors.name = 'Enter a company name (at least 2 characters).'
  if (values.tagline.trim().length < 3) errors.tagline = 'Enter a short tagline.'
  if (values.description.trim().length < 20) errors.description = 'Description should be at least 20 characters.'

  const cleanedWebsite = values.website.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '')
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(cleanedWebsite)) {
    errors.website = 'Enter a valid domain, e.g. example.com'
  }

  const year = Number(values.foundedYear)
  if (!Number.isInteger(year) || year < 1900 || year > CURRENT_YEAR) {
    errors.foundedYear = `Enter a year between 1900 and ${CURRENT_YEAR}.`
  }

  // Without a category, a company never appears in any category
  // leaderboard/page — the primary way customers discover companies —
  // so this is required, not optional.
  if (!values.categoryId) errors.categoryId = 'Choose a category.'

  return errors
}

export function CreateCompanyForm() {
  const navigate = useNavigate()
  const mutation = useCreateCompany()
  const logoUpload = useUploadCompanyLogo()
  const setCategoryMutation = useSetCompanyCategory()
  const categoriesQuery = useCategories()

  const [values, setValues] = useState<FormValues>({
    name: '',
    tagline: '',
    description: '',
    website: '',
    foundedYear: String(CURRENT_YEAR),
    categoryId: '',
  })
  const [logoColor, setLogoColor] = useState(LOGO_COLORS[0])
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<FormErrors>({})
  const submitting = mutation.isPending || logoUpload.isPending || setCategoryMutation.isPending

  function setField<K extends keyof FormValues>(key: K, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const validationErrors = validate(values)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    try {
      const company = await mutation.mutateAsync({
        slug: deriveSlug(values.name),
        name: values.name.trim(),
        initials: deriveInitials(values.name),
        logoColor,
        tagline: values.tagline.trim(),
        description: values.description.trim(),
        website: values.website.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, ''),
        foundedYear: Number(values.foundedYear),
      })

      // Same reasoning as the logo below: the category can only be set once
      // the company exists. Unlike the logo, a company with no category is
      // invisible to category-based discovery, so this failure gets its
      // own clear message pointing at Edit rather than being silently
      // grouped with "the logo didn't work."
      try {
        await setCategoryMutation.mutateAsync({ companyId: company.id, categoryId: values.categoryId })
      } catch (categoryErr) {
        toast.error(
          categoryErr instanceof Error
            ? `${company.name} was created, but setting its category failed: ${categoryErr.message}. You can set it from Edit.`
            : `${company.name} was created, but setting its category failed. You can set it from Edit.`,
        )
        navigate('/dashboard', { replace: true })
        return
      }

      // The logo can only be uploaded once the company (and its id, used in
      // the storage path) actually exists — a company with no logo is
      // still a fully valid, working company, so a failure here is
      // reported but doesn't undo the company that was just created.
      if (logoFile) {
        try {
          await logoUpload.mutateAsync({ companyId: company.id, file: logoFile })
        } catch (logoErr) {
          toast.error(
            logoErr instanceof Error
              ? `${company.name} was created, but the logo upload failed: ${logoErr.message}`
              : `${company.name} was created, but the logo upload failed.`,
          )
          navigate('/dashboard', { replace: true })
          return
        }
      }

      toast.success(`${company.name} is live on Outbid.`)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      if (isUniqueViolation(err)) {
        setErrors((prev) => ({ ...prev, name: 'That name is already taken on Outbid — try a different one.' }))
      } else {
        toast.error(err instanceof Error ? err.message : 'Could not create the company. Please try again.')
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <LogoPicker
        initials={deriveInitials(values.name || '?')}
        color={logoColor}
        onFileSelected={setLogoFile}
        disabled={submitting}
      />

      <div>
        <p className="mb-1.5 text-sm font-medium text-fg">Fallback color</p>
        <p className="mb-2 text-xs text-fg-subtle">Used for your initials avatar if you skip the logo, or if it ever fails to load.</p>
        <div className="flex flex-wrap gap-2">
          {LOGO_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={`Use logo color ${color}`}
              aria-pressed={logoColor === color}
              onClick={() => setLogoColor(color)}
              className={cn(
                'h-7 w-7 rounded-full ring-2 ring-offset-2 ring-offset-bg transition-transform hover:scale-110',
                logoColor === color ? 'ring-fg' : 'ring-transparent',
              )}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      <Field label="Company name" error={errors.name}>
        <Input value={values.name} onChange={(e) => setField('name', e.target.value)} placeholder="e.g. Flowstack" />
      </Field>

      <Field label="Tagline" error={errors.tagline}>
        <Input
          value={values.tagline}
          onChange={(e) => setField('tagline', e.target.value)}
          placeholder="One line describing what you do"
        />
      </Field>

      <Field label="Description" error={errors.description}>
        <textarea
          value={values.description}
          onChange={(e) => setField('description', e.target.value)}
          placeholder="What does your company do, and who is it for?"
          rows={4}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-subtle outline-none transition-colors focus:border-brand"
        />
      </Field>

      <Field label="Category" error={errors.categoryId}>
        <Select value={values.categoryId} onChange={(e) => setField('categoryId', e.target.value)}>
          <option value="">Choose a category…</option>
          {(categoriesQuery.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Website" error={errors.website}>
          <Input value={values.website} onChange={(e) => setField('website', e.target.value)} placeholder="example.com" />
        </Field>
        <Field label="Founded year" error={errors.foundedYear}>
          <Input
            type="number"
            value={values.foundedYear}
            onChange={(e) => setField('foundedYear', e.target.value)}
            min={1900}
            max={CURRENT_YEAR}
          />
        </Field>
      </div>

      <Button type="submit" disabled={submitting} className="mt-2">
        {mutation.isPending
          ? 'Creating…'
          : setCategoryMutation.isPending
            ? 'Setting category…'
            : logoUpload.isPending
              ? 'Uploading logo…'
              : 'Create company'}
      </Button>
    </form>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-fg">{label}</span>
      {children}
      {error && <span className="text-xs text-danger">{error}</span>}
    </label>
  )
}
