import { flatNavigationItems } from "./navigation";

export function rankNavigationItems(searchQuery: string, activeGroupId?: string) {
  return flatNavigationItems
    .map((item) => ({
      item,
      score: getNavigationSearchScore(item, searchQuery, activeGroupId),
    }))
    .filter((entry) => entry.score >= 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.item.label.localeCompare(right.item.label, "ko");
    })
    .map((entry) => entry.item);
}

function getNavigationSearchScore(
  item: (typeof flatNavigationItems)[number],
  searchQuery: string,
  activeGroupId?: string,
) {
  if (searchQuery.length === 0) {
    return item.groupId === activeGroupId ? 5 : 1;
  }

  const label = item.label.toLowerCase();
  const groupLabel = item.groupLabel.toLowerCase();
  const description = item.description.toLowerCase();
  const groupDescription = item.groupDescription.toLowerCase();
  const route = item.to.toLowerCase();

  let score = -1;

  if (label === searchQuery) {
    score = 120;
  } else if (label.startsWith(searchQuery)) {
    score = 90;
  } else if (label.includes(searchQuery)) {
    score = 70;
  } else if (groupLabel.startsWith(searchQuery)) {
    score = 56;
  } else if (groupLabel.includes(searchQuery)) {
    score = 48;
  } else if (description.includes(searchQuery)) {
    score = 40;
  } else if (groupDescription.includes(searchQuery)) {
    score = 32;
  } else if (route.includes(searchQuery)) {
    score = 24;
  }

  if (score < 0) {
    return -1;
  }

  if (item.groupId === activeGroupId) {
    return score + 3;
  }

  return score;
}
