export async function getCalls(status = 'active,ended') {
    const res = await fetch(`http://localhost:3000/api/calls?status=${status}`);
    return res.json();
  }
  