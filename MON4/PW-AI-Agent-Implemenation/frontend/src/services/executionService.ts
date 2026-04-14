import api from './api';

export async function runTests(config: {
  browser?: string;
  tags?: string[];
  headless?: boolean;
}) {
  const { data } = await api.post('/run', config);
  return data;
}

export async function stopTests() {
  const { data } = await api.post('/run/stop');
  return data;
}

export async function getRunStatus(runId: string) {
  const { data } = await api.get(`/run/${runId}`);
  return data;
}

export async function getRunHistory() {
  const { data } = await api.get('/run');
  return data;
}
