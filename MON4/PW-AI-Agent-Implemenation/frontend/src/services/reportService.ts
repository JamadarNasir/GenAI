import api from './api';

export async function getReportStatus() {
  const { data } = await api.get('/report');
  return data;
}

export async function generateReport() {
  const { data } = await api.post('/report/generate');
  return data;
}
