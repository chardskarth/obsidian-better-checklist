<script lang="ts">
  import Icon from './Icon.svelte'
  import {clickOutside} from './clickOutside.directive'

  export let selectedChecklistFilterName: string
  export let checklistFilterNames: string[] = ['asdf']
  export let onSelectedChecklistFilterChange: (event: Event) => void
  export let onSettingsButtonClicked: (event: Event) => void

  let showPopover = false
</script>

<div class="container">
  <select
      bind:value={selectedChecklistFilterName}
      class="checklist-select-filter dropdown"
      on:change={onSelectedChecklistFilterChange}>
    {#each checklistFilterNames as filterNames}
      <option value={filterNames}>{filterNames}</option>
    {/each}
  </select>
  <div class="settings-container">
    <Icon
      name="settings"
      style="button"
      on:click={ev => {
        // showPopover = !showPopover
        onSettingsButtonClicked(ev)
      }} />
    {#if showPopover}
      <div
        use:clickOutside
        on:click_outside={ev => {
          showPopover = false
        }}
        class="popover">
        <section>
          <div class="empty">There's nothing to see here yet!</div>
        </section>
      </div>
    {/if}
  </div>
</div>

<style>
  .empty {
    color: var(--text-faint);
    text-align: center;
    margin-top: 32px;
    font-style: italic;
  }

  .checklist-select-filter {
    flex: 1;
  }

  .container {
    height: 32px;
    margin-bottom: 12px;
    display: flex;
    flex-direction: row;
    gap: 12px;
    align-items: center;
  }

  .search {
    flex: 1;
    background: var(--checklist-searchBackground);
    border: none;
    font-size: var(--checklist-contentFontSize);
    border-radius: var(--checklist-listItemBorderRadius);
    padding: 0px 8px;
    color: var(--checklist-textColor);
    height: 100%;
  }

  .search:focus {
    box-shadow: 0 0 0 2px var(--checklist-accentColor);
  }

  .settings-container {
    flex-shrink: 1;
    display: flex;
    align-items: center;
    position: relative;
  }

  .popover {
    position: absolute;
    top: 32px;
    right: 0px;
    width: 300px;
    padding: 12px;
    border-radius: var(--checklist-listItemBorderRadius);
    background: var(--checklist-searchBackground);
    box-shadow: 0 2px 4px var(--background-modifier-cover);
    z-index: 10;
  }

  .section-title {
    font-weight: bold;
    margin-bottom: 8px;
  }

  section {
    margin-bottom: 24px;
  }

  .checkbox-item label {
    gap: 4px;
    display: flex;
    align-items: center;
    height: 28px;
  }

  .hash {
    color: var(--checklist-tagBaseColor);
  }
</style>
