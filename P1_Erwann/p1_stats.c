// SPDX-License-Identifier: GPL-2.0
/*
 * p1_stats.c - affichage d'un tableau d'entiers et de ses statistiques
 * Auteur : Erwann Arnould
 */
#include <linux/kernel.h>
#include <linux/printk.h>
#include "p1.h"

void p1_show_stats(const int *tab, int n)
{
	int i, sum = 0, mini = tab[0], maxi = tab[0], pairs = 0;

	for (i = 0; i < n; i++) {
		pr_info(P1_TAG "nums[%d] = %d\n", i, tab[i]);
		sum += tab[i];
		if (tab[i] < mini)
			mini = tab[i];
		if (tab[i] > maxi)
			maxi = tab[i];
		if (tab[i] % 2 == 0)
			pairs++;
	}

	/* pas de flottants dans le noyau : moyenne entière */
	pr_info(P1_TAG "%d valeur(s) : somme=%d min=%d max=%d moyenne=%d pairs=%d\n",
		n, sum, mini, maxi, sum / n, pairs);
}
