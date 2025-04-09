function createSubtaskElement(subtask, taskId) {
  const template = document.getElementById('subtask-template');
  const subtaskElement = document.importNode(template.content, true).querySelector('.subtask-item');

  subtaskElement.dataset.id = subtask.id;

  const subtaskIdElement = subtaskElement.querySelector('.subtask-id');
  subtaskIdElement.textContent = `${taskId}.${subtask.id}`;

  const subtaskTitleElement = subtaskElement.querySelector('.subtask-title');
  subtaskTitleElement.textContent = subtask.title;

  const subtaskStatusElement = subtaskElement.querySelector('.subtask-status');
  subtaskStatusElement.textContent = subtask.status || 'pending';
  subtaskStatusElement.classList.add(`status-${subtask.status || 'pending'}`);

  return subtaskElement;
}