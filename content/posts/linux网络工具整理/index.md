---
title: "Linux网络工具整理"
date: 2023-10-23T11:39:52+08:00
tags:
  - Linux
  - Network
image:
comments: false
---

## 网络配置工具/服务

### ifup/ifdown/ifconfig/ip

**简介**

操作系统最基本的网络配置工具

---
**命令行工具**

- ifup
- ifdown
- ifquery
- ifconfig
- ip

---
**配置文件**

系统基本的网络设置，根据操作系统发行版不同而有所差别

- fedora/redhat

    ```/etc/sysconfig/network-scripts/ifcfg-en*```

- debian/ubuntu

    ```/etc/network/interfaces```

---
**Reference Manuals**

ifup(8), interfaces(5), ip(8), ifconfig(8)
