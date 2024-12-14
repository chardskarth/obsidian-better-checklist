<script lang="ts">
  import type {App} from 'obsidian'
  import type {
    LookAndFeel,
    TodoGroup,
    BaseGroup,
    TodoSettings,
  } from 'src/_types'
  import ChecklistGroup from './ChecklistGroup.svelte'
  import Header from './Header.svelte'

  export let todoTags: string[]
  export let lookAndFeel: LookAndFeel
  export let _collapsedSections: string[]
  export let _hiddenTags: string[]
  export let updateSetting: (updates: Partial<TodoSettings>) => Promise<void>
  export let todoGroups: TodoGroup[] = []
  export let todoGroupsKeys: string
  export let selectedChecklistFilterName: string
  export let checklistFilterNames: string[]
  export let onSettingsButtonClicked: (event: Event) => void
  export let onChecklistClicked: (
    event: MouseEvent,
    group: TodoGroup
  ) => void

  const toggleGroup = (id: string) => {
    const newCollapsedSections = _collapsedSections.includes(id)
      ? _collapsedSections.filter(e => e !== id)
      : [..._collapsedSections, id]
    updateSetting({_collapsedSections: newCollapsedSections})
  }

  const updateTagStatus = (tag: string, status: boolean) => {
    const newHiddenTags = _hiddenTags.filter(t => t !== tag)
    if (!status) newHiddenTags.push(tag)
    updateSetting({_hiddenTags: newHiddenTags})
  }

  const onSelectedChecklistFilterChange = (event: Event) => {
    updateSetting({
      selectedChecklistFilter: event.target.value,
    })
  }
</script>

<div class="checklist-plugin-main markdown-preview-view">
  <Header
    {todoTags}
    {onSettingsButtonClicked}
    hiddenTags={_hiddenTags}
    onTagStatusChange={updateTagStatus}
    {checklistFilterNames}
    {selectedChecklistFilterName}
    {onSelectedChecklistFilterChange} />
  {#if todoGroups.length === 0}
    <div class="empty">No checklists found in all files</div>
  {:else}
    {#each todoGroups as group (todoGroupsKeys)}
      <ChecklistGroup
        {group}
        {onChecklistClicked}
        {lookAndFeel}
        collapsedSections={_collapsedSections}
        onToggle={toggleGroup} />
    {/each}
  {/if}
</div>

<style>
  .empty {
    color: var(--text-faint);
    text-align: center;
    margin-top: 32px;
    font-style: italic;
  }

  .checklist-plugin-main {
    padding: initial;
    width: initial;
    height: initial;
    position: initial;
    overflow-y: initial;
    overflow-wrap: initial;
  }
</style>
