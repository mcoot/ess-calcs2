import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FileDropZone } from './file-drop-zone'

describe('FileDropZone', () => {
  it('renders a file input and browse button', () => {
    render(<FileDropZone onFilesSelected={() => {}} />)
    expect(screen.getByRole('button', { name: /browse/i })).toBeDefined()
    expect(document.querySelector('input[type="file"]')).toBeDefined()
  })

  it('fires onFilesSelected when files are picked via input', async () => {
    const user = userEvent.setup()
    const onFiles = vi.fn()
    render(<FileDropZone onFilesSelected={onFiles} />)

    const file = new File(['Award Summary\ncol1,col2'], 'awards.csv', { type: 'text/csv' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, file)

    expect(onFiles).toHaveBeenCalledOnce()
    expect(onFiles.mock.calls[0][0]).toHaveLength(1)
    expect(onFiles.mock.calls[0][0][0].name).toBe('awards.csv')
  })
})
