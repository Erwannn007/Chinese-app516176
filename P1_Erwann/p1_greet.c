// SPDX-License-Identifier: GPL-2.0
/*
 * p1_greet.c - messages affichés selon la langue choisie
 * Auteur : Erwann Arnould
 */
#include <linux/kernel.h>
#include <linux/printk.h>
#include <linux/ctype.h>
#include <linux/string.h>
#include "p1.h"

#define NB_LANG 4

static const char *const msg_hello[NB_LANG] = { "Hello", "Bonjour", "Ni hao", "Hola" };
static const char *const msg_bye[NB_LANG]   = { "Goodbye", "Au revoir", "Zai jian", "Adios" };

/* Retourne une langue valide (0 par défaut si la valeur est hors limites) */
static int valid_lang(int lang)
{
	if (lang < 0 || lang >= NB_LANG) {
		pr_warn(P1_TAG "lang=%d inconnue, anglais utilise par defaut\n", lang);
		return 0;
	}
	return lang;
}

/* Copie src dans dst en majuscules (dst de taille len) */
static void to_upper(char *dst, const char *src, size_t len)
{
	size_t i;

	for (i = 0; i + 1 < len && src[i]; i++)
		dst[i] = toupper(src[i]);
	dst[i] = '\0';
}

void p1_say_hello(const char *name, int lang, int times, bool shout)
{
	char word[32], who[64];
	int i;

	lang = valid_lang(lang);

	if (shout) {
		to_upper(word, msg_hello[lang], sizeof(word));
		to_upper(who, name, sizeof(who));
	} else {
		strscpy(word, msg_hello[lang], sizeof(word));
		strscpy(who, name, sizeof(who));
	}

	for (i = 1; i <= times; i++)
		pr_info(P1_TAG "[%d/%d] %s, %s%s\n", i, times, word, who,
			shout ? " !!!" : " !");
}

void p1_say_bye(const char *name, int lang)
{
	lang = valid_lang(lang);
	pr_info(P1_TAG "%s, %s ! Module retire.\n", msg_bye[lang], name);
}
