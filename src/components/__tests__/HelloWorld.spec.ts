import { describe, it, expect } from 'vitest'

import { mount } from '@vue/test-utils'
import KAdsorbent from "../KAdsorbent.vue";

describe('KAdsorbent', () => {
  it('renders properly', () => {
    const wrapper = mount(KAdsorbent, { props: { msg: 'Hello Vitest' } })
    expect(wrapper.text()).toContain('Hello Vitest')
  })
})
