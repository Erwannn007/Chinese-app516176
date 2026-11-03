/* SPDX-License-Identifier: GPL-2.0 */
/*
 * p1.h - prototypes partagés entre les fichiers du module p1_erwann
 * Auteur : Erwann Arnould
 */
#ifndef P1_H
#define P1_H

#include <linux/types.h>

#define P1_TAG "p1_erwann: "

/* p1_greet.c */
void p1_say_hello(const char *name, int lang, int times, bool shout);
void p1_say_bye(const char *name, int lang);

/* p1_stats.c */
void p1_show_stats(const int *tab, int n);

#endif /* P1_H */
