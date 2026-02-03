export async function getScheduleGD() {
  const res = await fetch(
    'https://script.google.com/macros/s/AKfycbwkhgUFEMrA8xxPbaIF6MTJDktdpHt5zfO3mcqR1VCxuGmMCyx7HyFaUVUmGS2YJqYKAQ/exec?type=schedule_gd',
    { cache: 'no-store' }
  );

  if (!res.ok) {
    throw new Error('Failed to fetch Schedule GD');
  }

  return res.json();
}
