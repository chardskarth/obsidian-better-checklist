import { classifyString, sortGenericItemsInplace } from './helpers'

import type { TodoItem, TodoGroup, GroupByType, SortDirection } from 'src/_types'

export const groupTodos = (
  items: TodoItem[],
  groupBy: GroupByType,
  sortGroups: SortDirection,
  sortItems: SortDirection,
  subGroups: boolean,
  subGroupSort: SortDirection,
  maxItemPerGroup: Number
): TodoGroup[] => {
  const groups: TodoGroup[] = []
  for (const item of items) {
    let itemKey;
    switch (groupBy) {
      case 'page': {
        itemKey = item.filePath
        break;
      }
      case 'tag': {
        itemKey = `#${[item.mainTag, item.subTag].filter(e => e != null).join('/')}`
      }
    }

    let group = groups.find(g => g.id === itemKey)

    if (!group) {
      const newGroup: TodoGroup = {
        id: itemKey,
        sortName: '',
        className: '',
        type: groupBy,
        todos: [],
        oldestItem: Infinity,
        newestItem: 0,
      }

      if (newGroup.type === 'page') {
        newGroup.pageName = item.fileLabel
        newGroup.sortName = item.fileLabel
        newGroup.className = classifyString(item.fileLabel)
      } else if (newGroup.type === 'tag') {
        newGroup.mainTag = item.mainTag
        newGroup.subTags = item.subTag
        newGroup.sortName = item.mainTag + (item.subTag ?? '0')
        newGroup.className = classifyString(
          (newGroup.mainTag ?? '') + (newGroup.subTags ?? ''),
        )
      }
      groups.push(newGroup)
      group = newGroup
    }
    if (group.newestItem < item.fileCreatedTs)
      group.newestItem = item.fileCreatedTs
    if (group.oldestItem > item.fileCreatedTs)
      group.oldestItem = item.fileCreatedTs

    group.todos.push(item)
  }

  const nonEmptyGroups = groups.filter(g => g.todos.length > 0)

  sortGenericItemsInplace(
    nonEmptyGroups,
    sortGroups,
    'sortName',
    sortGroups === 'new->old' ? 'newestItem' : 'oldestItem',
  )

  if (!subGroups) {
    for (const g of groups) {
      g.todos = !maxItemPerGroup ? g.todos : g.todos.slice(0, maxItemPerGroup)
      sortGenericItemsInplace(
        g.todos,
        sortItems,
        'originalText',
        'fileCreatedTs',
      )
    }
  } else {
    for (const g of nonEmptyGroups) {
      g.groups = groupTodos(
        g.todos,
        groupBy === 'page' ? 'tag' : 'page',
        subGroupSort,
        sortItems,
        false,
        null,
        maxItemPerGroup
      )
      delete g.todos
    }
  }

  return nonEmptyGroups
}
