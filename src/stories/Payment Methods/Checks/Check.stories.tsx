import type { Meta, StoryObj } from '@storybook/react'
import { CheckComponent } from '../../../components'
import { vendorCheck } from '../../mockData'

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: 'Payment Methods/Check/Check Details',
  component: CheckComponent,
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/configure/story-layout
    layout: 'centered',
  },
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ['autodocs'],
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
  argTypes: {},
  // Use `fn` to spy on the onClick arg, which will appear in the actions panel once invoked: https://storybook.js.org/docs/essentials/actions#action-args
  args: {},
} satisfies Meta<typeof CheckComponent>

export default meta
type Story = StoryObj<typeof meta>

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Default: Story = {
  name: 'Existing Check',
  args: {
    account: vendorCheck,
  },
}

export const Edit: Story = {
  name: 'Edit Existing Check',
  args: {
    account: vendorCheck,
    showEdit: true,
  },
}

export const Selected: Story = {
  name: 'Selected Check',
  args: {
    account: vendorCheck,
    selected: true,
  },
}

export const New: Story = {
  name: 'Add New Check',
  args: {
    onSelect: (e) => {
      console.log(e)
    },
  },
}
