export const checkMaintenance = (equipment: any[]) => {

  const today = new Date();

  return equipment.filter(item => {

    if (!item.nextServiceDate) return false;

    const serviceDate = new Date(item.nextServiceDate);

    const diffDays =
      (serviceDate.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24);

    return diffDays <= 7;

  });

};