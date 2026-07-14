---
title: Core Components
type: index
category: infrastructure
status: active
canonical: true
codeImplementation: not-applicable
---

# [[Core Components]]

> Infrastructure components powering TSDoc Edge

## Overview

Low-level infrastructure components that provide essential services to the rest of the system.

## Components

### ConfigManager
Configuration loading and management from `.tsdoc.config.json`. See [[ConfigManager]].

### DatabaseManager
SQLite database operations for symbol and relationship storage. See [[DatabaseManager]].

### DepthTraverser
Graph traversal with configurable depth limits. See [[DepthTraverser]].

### SymbolRegistryManager
In-memory symbol registry for fast lookups. See [[SymbolRegistryManager]].

## Related

- [[Core Systems]] - System-level architecture
- [[Storage System]] - Storage infrastructure details
- [[Features Index]] - Feature documentation
