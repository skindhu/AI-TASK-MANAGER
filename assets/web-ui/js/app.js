/**
 * Task Master Web UI
 * Main application JavaScript
 */

// Global state
const state = {
  tasks: [],
  selectedTask: null,
  selectedTaskId: null,
  selectedSubtaskId: null,
  statusFilter: 'all'
};

// DOM References
const elements = {
  tasksList: document.getElementById('tasks-list'),
  taskDetails: document.getElementById('task-details'),
  refreshBtn: document.getElementById('refresh-btn'),
  statusFilter: document.getElementById('status-filter')
};

// Templates
const templates = {
  task: document.getElementById('task-template'),
  subtask: document.getElementById('subtask-template'),
  taskDetails: document.getElementById('task-details-template')
};

/**
 * Initialize the application
 */
function init() {
  // Add event listeners
  elements.refreshBtn.addEventListener('click', fetchTasks);
  elements.statusFilter.addEventListener('change', handleStatusFilterChange);

  // Fetch tasks on load
  fetchTasks();
}

/**
 * Fetch tasks from the API
 */
async function fetchTasks() {
  try {
    showLoading();

    const response = await fetch('/api/tasks');

    if (!response.ok) {
      throw new Error(`Failed to fetch tasks: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Update state
    state.tasks = data.tasks || [];

    // Render tasks
    renderTasks();
  } catch (error) {
    console.error('Error fetching tasks:', error);
    showError('Failed to load tasks. Please try again.');
  }
}

/**
 * Filter tasks based on the selected status
 * @returns {Array} Filtered tasks
 */
function getFilteredTasks() {
  if (state.statusFilter === 'all') {
    return state.tasks;
  }

  return state.tasks.filter(task => task.status.toLowerCase() === state.statusFilter);
}

/**
 * Show loading indicator
 */
function showLoading() {
  elements.tasksList.innerHTML = '<div class="loading">Loading tasks...</div>';
}

/**
 * Show error message
 * @param {string} message - Error message to display
 */
function showError(message) {
  elements.tasksList.innerHTML = `<div class="error">${message}</div>`;
}

/**
 * Handle status filter change
 */
function handleStatusFilterChange() {
  state.statusFilter = elements.statusFilter.value;
  renderTasks();
}

/**
 * Render the task list
 */
function renderTasks() {
  // Clear the tasks list
  elements.tasksList.innerHTML = '';

  const filteredTasks = getFilteredTasks();

  if (filteredTasks.length === 0) {
    elements.tasksList.innerHTML = '<div class="empty-state">No tasks found</div>';
    return;
  }

  // Sort tasks by ID
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    // If IDs are numbers, compare numerically
    if (!isNaN(a.id) && !isNaN(b.id)) {
      return parseInt(a.id, 10) - parseInt(b.id, 10);
    }
    // Otherwise, compare as strings
    return String(a.id).localeCompare(String(b.id));
  });

  // Create task elements
  sortedTasks.forEach(task => {
    const taskElement = createTaskElement(task);
    elements.tasksList.appendChild(taskElement);
  });

  // Re-select task if it's still in the filtered list
  if (state.selectedTaskId) {
    const selectedTask = filteredTasks.find(task => task.id === state.selectedTaskId);
    if (selectedTask) {
      selectTask(selectedTask);
    } else {
      clearTaskDetails();
    }
  }
}

/**
 * Create a task element from the template
 * @param {Object} task - Task data
 * @returns {HTMLElement} Task element
 */
function createTaskElement(task) {
  const taskTemplate = templates.task.content.cloneNode(true);
  const taskElement = taskTemplate.querySelector('.task-item');

  // Set task data
  taskElement.dataset.id = task.id;
  taskElement.querySelector('.task-title').textContent = task.title;
  taskElement.querySelector('.task-id').textContent = `ID: ${task.id}`;

  // Set status
  const statusElement = taskElement.querySelector('.task-status');
  statusElement.textContent = task.status;
  statusElement.classList.add(`status-${task.status.toLowerCase()}`);

  // Add event listener for clicking on task
  taskElement.querySelector('.task-header').addEventListener('click', (e) => {
    // If clicked on expander, toggle subtasks
    if (e.target.closest('.expander')) {
      toggleSubtasks(taskElement);
    } else {
      // Otherwise, select the task
      selectTask(task);
    }
  });

  // Add expander click handler
  const expander = taskElement.querySelector('.expander');
  expander.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleSubtasks(taskElement);
  });

  // Add subtasks if they exist
  if (task.subtasks && task.subtasks.length > 0) {
    const subtasksContainer = taskElement.querySelector('.subtasks-container');
    expander.classList.add('has-subtasks');

    task.subtasks.forEach(subtask => {
      const subtaskElement = createSubtaskElement(subtask, task.id);
      subtasksContainer.appendChild(subtaskElement);
    });
  } else {
    // Hide expander if no subtasks
    expander.style.visibility = 'hidden';
  }

  return taskElement;
}

/**
 * Create a subtask element from the template
 * @param {Object} subtask - Subtask data
 * @param {string|number} parentId - Parent task ID
 * @returns {HTMLElement} Subtask element
 */
function createSubtaskElement(subtask, parentId) {
  const subtaskTemplate = templates.subtask.content.cloneNode(true);
  const subtaskElement = subtaskTemplate.querySelector('.subtask-item');

  // Set subtask data
  subtaskElement.dataset.id = `${parentId}.${subtask.id}`;

  // Set subtask ID
  const subtaskIdElement = subtaskElement.querySelector('.subtask-id');
  subtaskIdElement.textContent = `${parentId}.${subtask.id}`;

  subtaskElement.querySelector('.subtask-title').textContent = subtask.title;

  // Set status
  const statusElement = subtaskElement.querySelector('.subtask-status');
  statusElement.textContent = subtask.status || 'pending';
  statusElement.classList.add(`status-${(subtask.status || 'pending').toLowerCase()}`);

  // Add event listener for clicking on subtask
  subtaskElement.addEventListener('click', () => {
    // Find parent task
    const parentTask = state.tasks.find(t => t.id === parentId);
    if (parentTask) {
      // Show the parent task details but highlight this subtask
      selectTask(parentTask, subtask.id);
    }
  });

  return subtaskElement;
}

/**
 * Toggle the visibility of subtasks
 * @param {HTMLElement} taskElement - Task element
 */
function toggleSubtasks(taskElement) {
  const subtasksContainer = taskElement.querySelector('.subtasks-container');
  const expander = taskElement.querySelector('.expander');

  // Check if subtasks exist
  if (subtasksContainer.children.length === 0) {
    return;
  }

  // Toggle display
  if (subtasksContainer.style.display === 'none') {
    subtasksContainer.style.display = 'block';
    expander.classList.add('expanded');
    expander.querySelector('i').style.transform = 'rotate(90deg)';
  } else {
    subtasksContainer.style.display = 'none';
    expander.classList.remove('expanded');
    expander.querySelector('i').style.transform = 'rotate(0)';
  }
}

/**
 * Select a task and show its details
 * @param {Object} task - Task data
 * @param {string|number} [subtaskId] - Optional subtask ID to highlight
 */
function selectTask(task, subtaskId = null) {
  // Update state
  state.selectedTask = task;
  state.selectedTaskId = task.id;
  state.selectedSubtaskId = subtaskId;

  // Highlight selected task in the list
  document.querySelectorAll('.task-item').forEach(el => {
    el.classList.remove('selected');
    if (el.dataset.id === task.id) {
      el.classList.add('selected');
    }
  });

  // If subtaskId is provided, show subtask details, otherwise show task details
  if (subtaskId) {
    const subtask = task.subtasks.find(s => s.id == subtaskId);
    if (subtask) {
      renderSubtaskDetails(task, subtask);
      return;
    }
  }

  // Render task details
  renderTaskDetails(task, subtaskId);
}

/**
 * Clear the task details panel
 */
function clearTaskDetails() {
  state.selectedTask = null;
  state.selectedTaskId = null;
  state.selectedSubtaskId = null;

  elements.taskDetails.innerHTML = `
    <div class="empty-state">
      <i class="far fa-clipboard"></i>
      <p>Select a task to view details</p>
    </div>
  `;
}

/**
 * Render task details
 * @param {Object} task - Task data
 * @param {string|number} [highlightSubtaskId] - Optional subtask ID to highlight
 */
function renderTaskDetails(task, highlightSubtaskId = null) {
  // Clone the template
  const detailsTemplate = templates.taskDetails.content.cloneNode(true);
  const detailsElement = detailsTemplate.querySelector('.task-details-content');

  // Add copy button at the top
  const copyBtn = document.createElement('button');
  copyBtn.className = 'copy-task-btn';
  copyBtn.innerHTML = '<i class="far fa-copy"></i> 复制英文结构';
  copyBtn.addEventListener('click', () => {
    // 显示加载中状态
    copyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 加载中...';

    // 获取任务的原始英文内容
    fetch(`/api/tasks/${task.id}?locale=en`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`获取任务数据失败: ${response.status}`);
        }
        return response.json();
      })
      .then(originalTask => {
        console.log('API返回的原始英文任务数据:', originalTask);

        // 使用原始英文数据构建复制文本
        const copyText = `Title: ${originalTask.title}\nDescription: ${originalTask.description || 'N/A'}\nDetails: ${originalTask.details || 'N/A'}`;

        // 复制到剪贴板
        return navigator.clipboard.writeText(copyText)
          .then(() => {
            // 显示成功反馈
            copyBtn.innerHTML = '<i class="fas fa-check"></i> 已复制！';
            setTimeout(() => {
              copyBtn.innerHTML = '<i class="far fa-copy"></i> 复制英文结构';
            }, 2000);
          });
      })
      .catch(err => {
        console.error('获取或复制数据失败:', err);
        alert('无法获取或复制英文内容: ' + err.message);
        copyBtn.innerHTML = '<i class="far fa-copy"></i> 复制英文结构';
      });
  });

  // Add copy button to the top right corner
  detailsElement.insertBefore(copyBtn, detailsElement.firstChild);

  // Fill in task details
  detailsElement.querySelector('.detail-title').textContent = task.title;
  detailsElement.querySelector('.detail-id').textContent = task.id;
  detailsElement.querySelector('.detail-status').textContent = task.status;
  detailsElement.querySelector('.detail-priority').textContent = task.priority || 'Medium';

  // Set dependencies
  const dependenciesEl = detailsElement.querySelector('.detail-dependencies');
  if (task.dependencies && task.dependencies.length > 0) {
    dependenciesEl.textContent = task.dependencies.join(', ');
  } else {
    dependenciesEl.textContent = 'None';
  }

  // Set description, details and test strategy
  detailsElement.querySelector('.detail-description').textContent = task.description || 'No description';
  detailsElement.querySelector('.detail-details').textContent = task.details || 'No details';
  detailsElement.querySelector('.detail-test-strategy').textContent = task.testStrategy || 'No test strategy';

  // Set subtasks section
  const subtasksSection = detailsElement.querySelector('.subtasks-section');
  const subtasksContainer = detailsElement.querySelector('.detail-subtasks');

  if (task.subtasks && task.subtasks.length > 0) {
    // Create list of subtasks
    const subtasksList = document.createElement('ul');
    subtasksList.className = 'detail-subtasks-list';

    task.subtasks.forEach(subtask => {
      const li = document.createElement('li');

      // Check if this subtask should be highlighted
      if (highlightSubtaskId && subtask.id == highlightSubtaskId) {
        li.classList.add('highlighted');
      }

      li.innerHTML = `
        <div class="detail-subtask-header">
          <span class="detail-subtask-id">${task.id}.${subtask.id}</span>
          <strong>${subtask.title}</strong>
          <span class="detail-subtask-status status-${(subtask.status || 'pending').toLowerCase()}">${subtask.status || 'pending'}</span>
        </div>
        <div class="detail-subtask-description">${subtask.description || ''}</div>
      `;

      subtasksList.appendChild(li);
    });

    subtasksContainer.appendChild(subtasksList);
  } else {
    subtasksSection.style.display = 'none';
  }

  // Set up status selector
  const statusSelector = detailsElement.querySelector('.status-selector');
  statusSelector.value = task.status.toLowerCase();

  // Set up update button
  const updateBtn = detailsElement.querySelector('.update-status-btn');
  updateBtn.addEventListener('click', () => updateTaskStatus(task.id, statusSelector.value));

  // Clear and append the details
  elements.taskDetails.innerHTML = '';
  elements.taskDetails.appendChild(detailsElement);
}

/**
 * Render subtask details
 * @param {Object} parentTask - Parent task data
 * @param {Object} subtask - Subtask data
 */
function renderSubtaskDetails(parentTask, subtask) {
  // Clone the template
  const detailsTemplate = templates.taskDetails.content.cloneNode(true);
  const detailsElement = detailsTemplate.querySelector('.task-details-content');

  // Add copy button at the top
  const copyBtn = document.createElement('button');
  copyBtn.className = 'copy-task-btn';
  copyBtn.innerHTML = '<i class="far fa-copy"></i> 复制英文结构';
  copyBtn.addEventListener('click', () => {
    // Format subtask data - ensure we're using original English fields
    const subtaskData = `Title: ${subtask.title}\nDescription: ${subtask.description || 'N/A'}\nDetails: ${subtask.details || 'N/A'}`;
    // Copy to clipboard
    navigator.clipboard.writeText(subtaskData)
      .then(() => {
        // Show feedback
        copyBtn.innerHTML = '<i class="fas fa-check"></i> 已复制！';
        setTimeout(() => {
          copyBtn.innerHTML = '<i class="far fa-copy"></i> 复制英文结构';
        }, 2000);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
        alert('复制任务失败');
      });
  });

  // Add copy button to the top right corner
  detailsElement.insertBefore(copyBtn, detailsElement.firstChild);

  // Fill in subtask details
  detailsElement.querySelector('.detail-title').textContent = subtask.title;
  detailsElement.querySelector('.detail-id').textContent = `${parentTask.id}.${subtask.id}`;
  detailsElement.querySelector('.detail-status').textContent = subtask.status || 'pending';
  detailsElement.querySelector('.detail-priority').textContent = subtask.priority || 'Medium';

  // Add back button
  const backBtn = document.createElement('button');
  backBtn.className = 'back-to-parent-btn';
  backBtn.innerHTML = '<i class="fas fa-arrow-left"></i> 返回父任务';
  backBtn.addEventListener('click', () => {
    // Remove the subtask ID and re-render the parent task details
    state.selectedSubtaskId = null;
    selectTask(parentTask);
  });

  // Create container for buttons
  const buttonsContainer = document.createElement('div');
  buttonsContainer.className = 'detail-buttons';
  buttonsContainer.appendChild(backBtn);

  // Add buttons to page
  const detailTitle = detailsElement.querySelector('.detail-title');
  detailTitle.parentNode.insertBefore(buttonsContainer, detailTitle);

  // Set parent task reference
  const detailInfo = detailsElement.querySelector('.detail-info');
  const parentTaskRow = document.createElement('div');
  parentTaskRow.className = 'detail-row';
  parentTaskRow.innerHTML = `
    <span class="detail-label">Parent Task:</span>
    <span class="detail-parent-task">${parentTask.id} - ${parentTask.title}</span>
  `;
  detailInfo.insertBefore(parentTaskRow, detailInfo.firstChild);

  // Set description, details
  detailsElement.querySelector('.detail-description').textContent = subtask.description || 'No description';
  detailsElement.querySelector('.detail-details').textContent = subtask.details || 'No details';

  // Hide test strategy for subtasks if not available
  const detailSections = detailsElement.querySelectorAll('.detail-section');
  let testStrategySection = null;
  detailSections.forEach(section => {
    if (section.querySelector('.detail-test-strategy')) {
      testStrategySection = section;
    }
  });

  if (testStrategySection) {
    if (!subtask.testStrategy) {
      testStrategySection.style.display = 'none';
    } else {
      detailsElement.querySelector('.detail-test-strategy').textContent = subtask.testStrategy;
    }
  }

  // Hide subtasks section
  const subtasksSection = detailsElement.querySelector('.subtasks-section');
  subtasksSection.style.display = 'none';

  // Set up status selector
  const statusSelector = detailsElement.querySelector('.status-selector');
  statusSelector.value = (subtask.status || 'pending').toLowerCase();

  // Set up update button
  const updateBtn = detailsElement.querySelector('.update-status-btn');
  updateBtn.addEventListener('click', () => {
    // Call API to update subtask status
    updateSubtaskStatus(parentTask.id, subtask.id, statusSelector.value);
  });

  // Clear and append the details
  elements.taskDetails.innerHTML = '';
  elements.taskDetails.appendChild(detailsElement);
}

/**
 * Update the status of a task
 * @param {string|number} taskId - Task ID to update
 * @param {string} newStatus - New status value
 */
async function updateTaskStatus(taskId, newStatus) {
  try {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: newStatus })
    });

    if (!response.ok) {
      throw new Error(`Failed to update task status: ${response.status} ${response.statusText}`);
    }

    // Refresh tasks to get updated data
    await fetchTasks();

    // Show success message
    alert(`Task ${taskId} status updated to ${newStatus}`);
  } catch (error) {
    console.error('Error updating task status:', error);
    alert(`Failed to update task status: ${error.message}`);
  }
}

/**
 * Update the status of a subtask
 * @param {string|number} parentTaskId - Parent task ID
 * @param {string|number} subtaskId - Subtask ID to update
 * @param {string} newStatus - New status value
 */
async function updateSubtaskStatus(parentTaskId, subtaskId, newStatus) {
  try {
    const response = await fetch(`/api/tasks/${parentTaskId}/subtasks/${subtaskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: newStatus })
    });

    if (!response.ok) {
      throw new Error(`Failed to update subtask status: ${response.status} ${response.statusText}`);
    }

    // Refresh tasks to get updated data
    await fetchTasks();

    // Show success message
    alert(`Subtask ${parentTaskId}.${subtaskId} status updated to ${newStatus}`);
  } catch (error) {
    console.error('Error updating subtask status:', error);
    alert(`Failed to update subtask status: ${error.message}`);
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);