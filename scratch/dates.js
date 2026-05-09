const nums = [46238, 46057, 46026, 46359, 46329, 46206, 46145, 46115, 45973, 45942, 45757, 45788, 46002, 45728, 45759, 45820];
for (let n of nums) {
  const d = new Date(Date.UTC(1899, 11, 30 + n));
  console.log(n, "=>", d.toISOString().split('T')[0]);
}
