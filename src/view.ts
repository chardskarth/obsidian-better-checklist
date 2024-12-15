import { ItemView, TagCache, TFile, WorkspaceLeaf } from 'obsidian'
import minimatch from 'minimatch'

import { TODO_VIEW_TYPE } from './constants'
import App from './svelte/App.svelte'
import { enumKeys, findAllTodosFromTagBlock, findAllTodosInFile, formTodov2, groupTodos, parseTodos } from './utils'

import type TodoPlugin from './main'
import { TodoSettings, TodoGroup, TodoItem, ChecklistFilter, FileInfo, GroupBy } from './_types'
import { check } from 'prettier'
import { getAllTagsFromMetadata, getTagMeta, retrieveTagMeta } from './utils/helpers'
import { navToFile } from 'src/utils'

export default class TodoListView extends ItemView {
	private _app: App
	private lastRerender = 0
	private groupedItems: TodoGroup[] = []
	private itemsByFile = new Map<string, TodoItem[]>()
	private searchTerm = ''

	constructor(
		leaf: WorkspaceLeaf,
		private plugin: TodoPlugin,
	) {
		super(leaf)
	}

	getViewType(): string {
		return TODO_VIEW_TYPE
	}

	getDisplayText(): string {
		return 'Better Checklist'
	}

	getIcon(): string {
		return 'checkmark'
	}

	get todoTagArray() {
		return this.plugin
			.getSettingValue('todoPageName')
			.trim()
			.split('\n')
			.map(e => e.toLowerCase())
			.filter(e => e)
	}

	get visibleTodoTagArray() {
		return this.todoTagArray.filter(
			t => !this.plugin.getSettingValue('_hiddenTags').includes(t),
		)
	}

	async onClose() {
		this._app.$destroy()
	}

	async onOpen(): Promise<void> {
		this._app = new App({
			target: (this as any).contentEl,
			props: this.props(),
		})
		let delayRefresh: any = 0

		const debouncedRefresh = () => {
			clearTimeout(delayRefresh)
			delayRefresh = setTimeout(async () => {
				await this.refreshTodos()
				this.renderView()
			}, 1000)
		}
		this.registerEvent(
			this.app.metadataCache.on('resolved', async () => {
				if (!this.plugin.getSettingValue('autoRefresh')) return
				debouncedRefresh()
			}),
		)
		this.registerEvent(
			this.plugin.app.metadataCache.on('dataview:metadata-change', async () => {
				debouncedRefresh()
			})
		)

		debouncedRefresh()
	}

	private props() {
		const _collapsedSections = this.plugin.getSettingValue('_collapsedSections')
		const todoGroupsKeys = _collapsedSections.map((x, ii) => `${x}_${this.groupedItems?.[ii]?.id}`)

		let selectedChecklistFilterName = this.plugin.getSettingValue("selectedChecklistFilter")
		let checklistFilterNames = this.plugin.getSettingValue("checklistFilters")
			.filter(x => x.enabled)
			.map(x => x.filterName)

		if(!checklistFilterNames.length) {
			checklistFilterNames = ["-- no filter available --"]
			selectedChecklistFilterName = "-- no filter available --"
		}

		return {
			todoTags: this.todoTagArray,
			lookAndFeel: this.plugin.getSettingValue('lookAndFeel'),
			subGroups: this.plugin.getSettingValue('subGroups'),
			_collapsedSections,
			selectedChecklistFilterName,
			todoGroups: this.groupedItems ?? [],
			todoGroupsKeys,
			checklistFilterNames,
			updateSetting: (updates: Partial<TodoSettings>) =>
				this.plugin.updateSettings(updates),
			onSearch: (val: string) => {
				this.searchTerm = val
				this.refresh()
			},
			onChecklistClicked: (ev: MouseEvent, group: TodoGroup) => {
				navToFile(app, group.id, ev)
			},
			onSettingsButtonClicked: async (ev: Event) => {
				const setting = (this.app as any).setting;
				await setting.open();
				setting.openTabById('obsidian-better-checklist-plugin');

				// find the selected filter name's setting to expand on open
				const settingItemNames = setting.containerEl.findAll(
					".better-checklist-settings-tab .checklist-filter .summaryHeading .setting-item-heading .setting-item-name"
				)
				const isThis = settingItemNames
					.filter(x => x.innerText === this.plugin.getSettingValue("selectedChecklistFilter"))[0]

				isThis.closest(".summaryHeading").find("div.handle").click()

			}

		}
	}

	private async calculateAllItems() {
		const todosForUkapdatedFiles = await parseTodos(
			this.app.vault.getFiles(),
			this.todoTagArray.length === 0 ? ['*'] : this.visibleTodoTagArray,
			this.app.metadataCache,
			this.app.vault,
			this.plugin.getSettingValue('includeFiles'),
			this.plugin.getSettingValue('showChecked'),
			this.plugin.getSettingValue('showAllTodos'),
			this.lastRerender,
		)
		for (const [file, todos] of todosForUpdatedFiles) {
			this.itemsByFile.set(file.path, todos)
		}
	}

	renderView() {
		const props = this.props()
		this._app.$set(props)
	}

	async refreshTodos() {
		this.lastRerender = 0
		const selectedCheckFilter = this.plugin.getSelectedChecklistFilter()

		if (!selectedCheckFilter) {
			this.groupedItems = null
			return
		}

		this.groupedItems = await this.getTodosByChecklistFilter(selectedCheckFilter)

		this.lastRerender = +new Date()
	}

	private async getTodosByChecklistFilter(checklistFilter: ChecklistFilter): Promise<TodoGroup[]> {

		const includeFilesDv = (this.app as any).plugins.plugins.dataview.api.pages(checklistFilter.minimatchFileNames)
		includeFilesDv
			.map(file => {
				return file
			})
			.filter(({ file: { mtime } }) => mtime > this.lastRerender)
			.map(file => {
				return file
			})

		const todoTags = checklistFilter.todosMatch
			.trim()
			.split('\n')
			.filter(e => e)
			.map(e => e.toLowerCase())

		const includeTags = todoTags.filter(tag => tag[0] !== '-')
		const excludeTags = todoTags.filter(tag => tag[0] === '-').map(x => x.replace('-', ''))

		const validFiles = await Promise.all(includeFilesDv.map(async (file) => {
			const tfile = await this.app.vault.getFileByPath(file.file.path)
			const content = await this.app.vault.cachedRead(tfile)
			const fileCache = this.app.metadataCache.getFileCache(tfile)

			const fileInfo: FileInfo = {
				content,
				cache: fileCache,
				validTags: null,
				file: tfile,
				parseEntireFile: null,
			}

			return fileInfo

		}))

		const validTodos = validFiles
			.flatMap((fileInfo) => {
				let todos: TodoItem[] = []

				const invalidTodos = (fileInfo.cache?.tags?.filter(tagCache => {
					const tagMeta = retrieveTagMeta(tagCache).toLowerCase()
					return excludeTags.includes(tagMeta)
				}).map(e => ({
					...e,
					tag: e.tag.toLowerCase(),
				})) ?? []).flatMap(tagCache =>
					findAllTodosFromTagBlock(fileInfo, tagCache)
				)

				if (!includeTags.length) {
					todos = findAllTodosInFile(fileInfo)
				} else {
					todos = (fileInfo.cache?.tags?.filter(tagCache => {
						const tagMeta = retrieveTagMeta(tagCache).toLowerCase()
						return includeTags.includes(tagMeta)
					}).map(e => ({
						...e,
						tag: e.tag.toLowerCase(),
					})) ?? []).flatMap(tagCache =>
						findAllTodosFromTagBlock(fileInfo, tagCache)
					)
				}

				return todos.filter(todo =>
					!invalidTodos.length || !invalidTodos.some(x => x.originalText === todo.originalText)
				)

			})
			.filter(todoItem => {
				return !todoItem.checked // && checklistFilter.showCompleted
			})

		let validGroups: TodoGroup[]

		switch (checklistFilter.groupBy) {
			case GroupBy.PageOnly: {
				validGroups = groupTodos(
					validTodos,
					'page',
					'new->old',
					'new->old',
					false,
					'new->old',
					checklistFilter.limitTodos
				)
				break;
			}
			case GroupBy.TagsOnly: {
				validGroups = groupTodos(
					validTodos,
					'tag',
					'new->old',
					'new->old',
					false,
					'new->old',
					checklistFilter.limitTodos
				)
				break;
			}
			case GroupBy.PageThenTags: {
				validGroups = groupTodos(
					validTodos,
					'page',
					'new->old',
					'new->old',
					true,
					'new->old',
					checklistFilter.limitTodos
				)
				break;
			}
			case GroupBy.TagsThenPage: {
				validGroups = groupTodos(
					validTodos,
					'tag',
					'new->old',
					'new->old',
					true,
					'new->old',
					checklistFilter.limitTodos
				)
				break;
			}
			default: {
				throw new Error(`Unknown grouping ${checklistFilter.groupBy}. Defaulting to ${GroupBy.PageOnly}`)
			}
		}
		return validGroups ?? []
	}

}
