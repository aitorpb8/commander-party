import { useState, useEffect, useMemo } from 'react';
import { DeckCard } from '@/types';
import { GroupBy, SortBy, ViewMode } from '@/components/deck/DeckFilters';
import { AdvancedFilters } from '@/components/deck/DeckFilterPanel';
import { calculateCMC, getCardFunction } from '@/lib/magicUtils';

interface UseDeckVisualizerProps {
  cards: DeckCard[];
  groupBy: GroupBy;
  sortBy: SortBy;
  filter: string;
  tagFilter: string | null;
  cardTags: Record<string, string[]>;
  advancedFilters: AdvancedFilters;
  externalCmcFilter: number | null;
}

export const useDeckVisualizer = ({
  cards,
  groupBy,
  sortBy,
  filter,
  tagFilter,
  cardTags,
  advancedFilters,
  externalCmcFilter
}: UseDeckVisualizerProps) => {
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const filteredCards = useMemo(() => {
    return cards.filter(card => {
      // 0. External CMC Filter (from Graph)
      if (externalCmcFilter !== null) {
        const cardCmc = calculateCMC(card.mana_cost);
        if (externalCmcFilter === 7) {
          if (cardCmc < 7) return false;
        } else {
          if (cardCmc !== externalCmcFilter) return false;
        }
      }

      // 1. Basic Text Filter
      const matchesSearch = card.card_name.toLowerCase().includes(filter.toLowerCase());
      const matchesTag = !tagFilter || (cardTags[card.card_name] && cardTags[card.card_name].includes(tagFilter));

      if (!matchesSearch || !matchesTag) return false;

      // 2. Advanced Filters
      if (advancedFilters.type && !((card.type_line || '').toLowerCase().includes(advancedFilters.type.toLowerCase()))) {
        return false;
      }
      if (advancedFilters.text && !((card.oracle_text || '').toLowerCase().includes(advancedFilters.text.toLowerCase()))) {
        return false;
      }
      if (advancedFilters.edition && card.set_code !== advancedFilters.edition) {
        return false;
      }
      
      if (advancedFilters.colors.length > 0) {
         const mc = card.mana_cost || '';
         const cardColors: string[] = [];
         if (mc.includes('W')) cardColors.push('W');
         if (mc.includes('U')) cardColors.push('U');
         if (mc.includes('B')) cardColors.push('B');
         if (mc.includes('R')) cardColors.push('R');
         if (mc.includes('G')) cardColors.push('G');
         if (cardColors.length === 0) cardColors.push('C');
         
         if (advancedFilters.colors.includes('C')) {
            if (cardColors.includes('C')) return true;
         }

         const hasMatch = advancedFilters.colors.some(c => cardColors.includes(c));
         if (!hasMatch) return false;
      }

      return true;
    });
  }, [cards, filter, tagFilter, cardTags, advancedFilters, externalCmcFilter]);

  const categories = useMemo(() => ({
    type: ['Commander', 'Creature', 'Planeswalker', 'Sorcery', 'Instant', 'Artifact', 'Enchantment', 'Battle', 'Land', 'Other'],
    cmc: ['0', '1', '2', '3', '4', '5', '6+'],
    color: ['White', 'Blue', 'Black', 'Red', 'Green', 'Multicolor', 'Colorless'],
    function: ['Commander', 'Ramp', 'Draw', 'Removal', 'Board Wipe', 'Other']
  }), []);

  const grouped = useMemo(() => {
    const res: { [key: string]: DeckCard[] } = {};
    filteredCards.forEach(card => {
      let key = 'Other';
      
      if (groupBy === 'type') {
        const typeLine = (card.type_line || '').toLowerCase();
        if (card.is_commander) key = 'Commander';
        else if (typeLine.includes('creature')) key = 'Creature';
        else if (typeLine.includes('planeswalker')) key = 'Planeswalker';
        else if (typeLine.includes('sorcery')) key = 'Sorcery';
        else if (typeLine.includes('instant')) key = 'Instant';
        else if (typeLine.includes('artifact')) key = 'Artifact';
        else if (typeLine.includes('enchantment')) key = 'Enchantment';
        else if (typeLine.includes('battle')) key = 'Battle';
        else if (typeLine.includes('land')) key = 'Land';
        else key = 'Other';
      } else if (groupBy === 'cmc') {
        const cmc = calculateCMC(card.mana_cost);
        key = cmc >= 6 ? '6+' : cmc.toString();
      } else if (groupBy === 'color') {
        const mc = card.mana_cost || '';
        const colors = [];
        if (mc.includes('W')) colors.push('White');
        if (mc.includes('U')) colors.push('Blue');
        if (mc.includes('B')) colors.push('Black');
        if (mc.includes('R')) colors.push('Red');
        if (mc.includes('G')) colors.push('Green');
        
        if (colors.length > 1) key = 'Multicolor';
        else if (colors.length === 1) key = colors[0];
        else key = 'Colorless';
      } else if (groupBy === 'function') {
        if (card.is_commander) key = 'Commander';
        else key = getCardFunction(card);
      }

      if (!res[key]) res[key] = [];
      res[key].push(card);
    });
    return res;
  }, [filteredCards, groupBy]);

  const sortCards = (list: DeckCard[]) => {
    return [...list].sort((a, b) => {
      if (sortBy === 'cmc') {
         const costA = calculateCMC(a.mana_cost);
         const costB = calculateCMC(b.mana_cost);
         if (costA !== costB) return costA - costB;
      }
      return a.card_name.localeCompare(b.card_name);
    });
  };

  const getColumnCount = (width: number) => {
    if (width < 700) return 1;
    if (width < 1000) return 2;
    if (width < 1300) return 3;
    if (width < 1600) return 4;
    if (width < 1900) return 5;
    return 6;
  };

  const columnCount = getColumnCount(windowWidth);

  const distributedColumns = useMemo(() => {
    const allCats = [...categories[groupBy]].filter(catName => (grouped[catName] || []).length > 0);
    const cmdIndex = allCats.findIndex(c => c.toLowerCase() === 'commander' || c.toLowerCase() === 'comandante');
    let cmdCategory = null;

    if (cmdIndex !== -1) {
       cmdCategory = allCats[cmdIndex];
       allCats.splice(cmdIndex, 1);
    }

    const activeCategories = allCats.sort((a, b) => { 
      const countA = (grouped[a] || []).reduce((acc, c) => acc + c.quantity, 0);
      const countB = (grouped[b] || []).reduce((acc, c) => acc + c.quantity, 0);
      return countB - countA;
    });

    const cols: string[][] = Array.from({ length: columnCount }, () => []);
    const colWeights = new Array(columnCount).fill(0);

    if (cmdCategory) {
        cols[0].push(cmdCategory);
        const count = grouped[cmdCategory].reduce((acc, c) => acc + c.quantity, 0);
        colWeights[0] += (count + 5); 
    }

    activeCategories.forEach(catName => {
        let minWeight = Infinity;
        let targetCol = 0;
        for (let i = 0; i < columnCount; i++) {
            if (colWeights[i] < minWeight) {
                minWeight = colWeights[i];
                targetCol = i;
            }
        }
        cols[targetCol].push(catName);
        const count = grouped[catName].reduce((acc, c) => acc + c.quantity, 0);
        colWeights[targetCol] += (count + 5); 
    });

    return cols;
  }, [grouped, groupBy, columnCount, categories]);

  return {
    filteredCards,
    grouped,
    distributedColumns,
    categories,
    sortCards,
    columnCount
  };
};
