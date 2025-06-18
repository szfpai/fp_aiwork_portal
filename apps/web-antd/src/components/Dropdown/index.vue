<script setup lang="ts">
import type { Component, Ref, VNode } from 'vue';

import { computed } from 'vue';

import { Dropdown, Menu, MenuItem } from 'ant-design-vue';
import isEmpty from 'lodash/isEmpty';
import isFunction from 'lodash/isFunction';

interface Props {
  options?: {
    [key: string]: any;
    className?: any;
    disabled?: boolean;
    hidden?: boolean;
    icon?: string;
    key: string;
    label: string;
    slots?: (() => VNode) | Component;
  }[];
  className?: any;
  filterOptions?: (v: any[]) => any[];
}

const props = withDefaults(defineProps<Props>(), {
  options: () => [],
  className: 'flex items-center',
  filterOptions: (v: any[]) => v,
});

const emit = defineEmits<{
  (e: 'click', payload?: any): void;
}>();

const filter = (v: any[]) => {
  if (!isFunction(props.filterOptions)) {
    throw new Error('filterOptions must be a function and return items');
  }
  return props.filterOptions(v);
};

const _options: Ref<any[]> = computed(() => {
  return filter(props.options);
});

const handleClick = (e: any) => emit('click', e);
</script>
<template>
  <Dropdown
    placement="bottomCenter"
    :class="className"
    v-bind="$attrs"
    v-if="!isEmpty(_options)"
  >
    <slot name="default" v-if="$slots.default" :row="_options"></slot>
    <span
      v-else
      class="icon-[lucide--ellipsis] text-[20px] text-[#adb3be]"
      @click.stop="null"
    >
    </span>
    <template #overlay v-if="$slots.overlay">
      <slot name="overlay" :row="_options"></slot>
    </template>
    <template #overlay v-else>
      <Menu @click="handleClick">
        <template v-for="item of _options" :key="item.key">
          <MenuItem
            :_payload="item"
            :disabled="item.disabled"
            v-if="item?.hidden !== true"
          >
            <component :is="item.slots" :row="item" v-if="item.slots" />
            <div class="flex items-center" v-else>
              <span v-if="item.icon" :class="item.icon"></span>
              <slot name="menuItem" v-if="$slots.menuItem" :row="item"></slot>
              <span v-else :class="item.className">{{ item.label }}</span>
            </div>
          </MenuItem>
        </template>
      </Menu>
    </template>
  </Dropdown>
</template>
