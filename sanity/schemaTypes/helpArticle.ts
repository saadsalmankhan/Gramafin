import { defineField, defineType } from 'sanity'

export const helpArticle = defineType({
  name: 'helpArticle',
  title: 'Help Article',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: rule => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: rule => rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: [
          { title: 'Getting started', value: 'getting-started' },
          { title: 'Expenses & budgets', value: 'expenses-budgets' },
          { title: 'Net worth & credit cards', value: 'net-worth' },
          { title: 'Investments & mutual funds', value: 'investments' },
          { title: 'Account & billing', value: 'account' },
        ],
      },
      validation: rule => rule.required(),
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      rows: 2,
      description: 'Short summary shown on the help center index page.',
      validation: rule => rule.required().max(200),
    }),
    defineField({
      name: 'mainImage',
      title: 'Image',
      type: 'image',
      options: { hotspot: true },
      description: 'Must be Creative Commons licensed (or public domain). Fill in attribution below.',
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'string',
          validation: rule => rule.required(),
        }),
        defineField({
          name: 'attribution',
          title: 'Attribution',
          type: 'object',
          fields: [
            defineField({ name: 'author', title: 'Author', type: 'string' }),
            defineField({ name: 'sourceUrl', title: 'Source URL', type: 'url' }),
            defineField({
              name: 'license',
              title: 'License',
              type: 'string',
              options: {
                list: ['CC0', 'CC BY 2.0', 'CC BY 3.0', 'CC BY 4.0', 'CC BY-SA 3.0', 'CC BY-SA 4.0', 'Public Domain'],
              },
            }),
          ],
        }),
      ],
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [{ type: 'block' }],
      validation: rule => rule.required(),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published at',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
    }),
  ],
  preview: {
    select: { title: 'title', subtitle: 'category' },
  },
})
