# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Translation Cron Service

This is a scheduled background service for the JioNews Translation Service that handles periodic translation tasks. The cron service processes translation jobs in batches, updates translations for existing articles, and performs maintenance tasks.

## Purpose

The cron service handles:
- Batch translation of new articles
- Re-translation of updated news content
- Translation cache updates
- Translation quality monitoring and analytics
- Cleanup of old translation jobs

## Architecture

This is a standalone cron-based microservice that:
- Runs on a scheduled basis (configurable intervals)
- Connects to the main JioNews database to fetch articles needing translation
- Interfaces with translation APIs (Google Translate, DeepL, or custom models)
- Stores translated content back to the database
- Logs translation metrics and errors

## Key Design Considerations

- **Idempotency**: Jobs should be safely re-runnable without duplication
- **Error Handling**: Failed translations should be retried with exponential backoff
- **Rate Limiting**: Respect translation API rate limits
- **Monitoring**: Track translation success rates, processing times, and failures
- **Scalability**: Support parallel processing of translation batches
