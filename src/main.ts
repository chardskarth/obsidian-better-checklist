import { Plugin, Notice } from 'obsidian'

import { TODO_VIEW_TYPE } from './constants'
import { DEFAULT_SETTINGS, TodoSettingTab } from './settings'
import type { ChecklistFilter, TodoSettings } from "./_types"
import TodoListView from './view'

export default class TodoPlugin extends Plugin {
	private settings: TodoSettings

	get view() {
		return this.app.workspace.getLeavesOfType(TODO_VIEW_TYPE)[0]
			?.view as TodoListView
	}

	async onload() {
		await this.loadSettings()

		this.addSettingTab(new TodoSettingTab(this.app, this))
		this.addCommand({
			id: 'show-checklist-view',
			name: 'Show Checklist Pane',
			callback: () => {
				const workspace = this.app.workspace
				const views = workspace.getLeavesOfType(TODO_VIEW_TYPE)
				if (views.length === 0) {

					setTimeout(async () => {
						await this.view.refreshTodos()
						this.view.renderView()
					})

					workspace
						.getRightLeaf(false)
						.setViewState({
							type: TODO_VIEW_TYPE,
							active: true,
						})
						.then(() => {
							const todoLeaf = workspace.getLeavesOfType(TODO_VIEW_TYPE)[0]
							workspace.revealLeaf(todoLeaf)
							workspace.setActiveLeaf(todoLeaf, true, true)
						})
				} else {
					views[0].setViewState({
						active: true,
						type: TODO_VIEW_TYPE,
					})
					workspace.revealLeaf(views[0])
					workspace.setActiveLeaf(views[0], true, true)
				}
			},
		})
		this.addCommand({
			id: 'refresh-better-checklist',
			name: 'Reload Checklist',
			callback: async () => {
				const loadedData = await this.loadData()
				this.settings = { ...DEFAULT_SETTINGS, ...loadedData }
				await this.view.refreshTodos()
				this.view.renderView()

				new Notice("Checklist reloaded!", 5000)
			},
		})

		this.registerView(TODO_VIEW_TYPE, leaf => {
			const newView = new TodoListView(leaf, this)
			return newView
		})

		if (this.app.workspace.layoutReady) this.initLeaf()
		else this.app.workspace.onLayoutReady(() => this.initLeaf())
	}

	initLeaf(): void {
		if (this.app.workspace.getLeavesOfType(TODO_VIEW_TYPE).length) return

		this.app.workspace.getRightLeaf(false).setViewState({
			type: TODO_VIEW_TYPE,
			active: true,
		})
	}

	async onunload() {
		this.app.workspace.getLeavesOfType(TODO_VIEW_TYPE)[0]?.detach()
	}

	async loadSettings() {
		const loadedData = await this.loadData()
		this.settings = { ...DEFAULT_SETTINGS, ...loadedData }

		// let isSyncedOnce = false
		// let delayRefresh: any = 0
		// let sync = this.app.internalPlugins.plugins.sync.instance;
		// sync.on("status-change", () => {
		//   if (sync.syncStatus !== 'Fully synced') return;
		//   console.log("sync status is", sync.syncStatus)
		//   clearTimeout(delayRefresh)
		//   delayRefresh = setTimeout(async () => {
		//     const loadedData = await this.loadData()
		//     this.settings = { ...DEFAULT_SETTINGS, ...loadedData }
		//   }, 1000)
		// })
	}

	async updateSettings(
		updates: Partial<TodoSettings>,
		skipRefreshView = false
	) {
		Object.assign(this.settings, updates)
		await this.saveData(this.settings)

		if (skipRefreshView) {
			return
		}

		const onlyRepaintWhenChanges = [
			'autoRefresh',
			'lookAndFeel',
			'_collapsedSections',
		]

		const checkIfCalculateTodos = [
			'checklistFilters',
			'selectedChecklistFilter'
		]

		const updateKeys = Object.keys(updates)

		if (onlyRepaintWhenChanges.some(key => updateKeys.contains(key))) {
			this.view.renderView()
		}

		if (checkIfCalculateTodos.some(key => updateKeys.contains(key))) {
			await this.view.refreshTodos()
			this.view.renderView()
		}
	}

	getSettingValue<K extends keyof TodoSettings>(setting: K): TodoSettings[K] {
		return this.settings[setting]
	}

	getChecklistFilters(): ChecklistFilter[] {
		return this.getSettingValue("checklistFilters")
	}

	getSelectedChecklistFilter(): ChecklistFilter {
		const checklistFilters = this.getSettingValue('checklistFilters')
		let selectedFilter = checklistFilters.find(
			x => x.filterName === this.getSettingValue('selectedChecklistFilter')
		)

		if (!selectedFilter) {
			selectedFilter = checklistFilters[0]
		}

		if (!selectedFilter) {
			console.error("There's no filter currently set")
		}

		return selectedFilter
	}
}
