---
title: "CAN总线调研"
publishDate: "03 December 2025"
description: "CAN总线协议栈，原理，以太网对比，以及仿真实现"
tags: ["can", "python-can", "network"]
---

## 1 概览

控制器局域网（Controller Area Network, CAN）是一种面向实时控制的差分总线协议，广泛应用于汽车、工业控制、机器人等场景。它以多主、事件触发、消息仲裁为核心特征，提供高可靠性与容错能力。本文围绕以下主题展开：
- CAN协议栈结构与关键层次
- 物理层与数据链路层的工作原理（仲裁、位填充、错误机制）
- 与以太网的对比（性能、实时性、可靠性、成本与拓扑）
- 仿真实现与开发实践（python-can、虚拟回环、SocketCAN）

## 2 CAN协议栈

虽然CAN并未严格对应OSI七层模型，但工程实践中可将其分层理解如下：

- 物理层（Physical Layer）
  - 传输介质：双绞线（CAN_H / CAN_L）
  ![](https://www.csselectronics.com/cdn/shop/files/twisted-can-bus-wiring-harness-high-low-green-yellow.svg?v=1633690039)
  - 拓扑：总线型，两端需匹配约120Ω终端电阻
  ![](https://canlogger1000.csselectronics.com/img/CAN-bus-ECU-node-communication-send-accept-reject.svg)
  - 信号编码：差分电平，显性（dominant）/隐性（recessive）
  - 典型速率：Classical CAN 10 kbps–1 Mbps；CAN FD数据段可达2–5 Mbps

- 数据链路层（Data Link Layer）
  - 帧结构：仲裁ID、控制字段、数据字段、CRC、ACK、EOF
  - 仲裁机制：基于显性/隐性位的无碰撞仲裁（CSMA/CR）
  - 位填充（Bit Stuffing）：避免过长同值位序列，插入相反位
  - 错误检测与处理：位错误、填充错误、CRC错误、格式错误、ACK错误；错误计数器与bus-off机制
  - ACK：正确接收节点在ACK槽发送显性位确认

- 上层协议（Higher-layer Protocols）

  - CANopen：面向工业自动化（对象字典、PDO/SDO）
  - J1939：商用车与重型设备（PGN、地址、优先级）
  - ISO-TP（ISO 15765-2）：长报文分段与重组（UDS常用）
  - UDS（ISO 14229）：统一诊断服务，基于ISO-TP的请求/响应

- 设备与软件栈（Device & Software）
  - 控制器：MCP2515、或MCU内置CAN（STM32、NXP、Infineon等）
  - 驱动与操作系统：Linux SocketCAN、Windows设备驱动、RTOS集成
  - 应用层库：`python-can`、`cantools`、CANopen/J1939/UDS协议栈

## 3 CAN物理硬件

### 3.1 组成模块

![](https://canlogger1000.csselectronics.com/img/ecu-electronic-control-unit-can-bus-node.svg)

- 微控制器（MCU）：MCU 是 ECU 的核心，它解释传入的 CAN 消息并决定要发送哪些消息。例如，一个传感器可能被编程为以 5 Hz 的频率测量并广播机油温度。

- CAN 控制器（CAN Controller）：控制器通常集成在 MCU 中，并确保所有通信符合 CAN 协议（消息编码、错误检测、仲裁等）——从而将复杂性从 MCU 中移除。

- CAN 收发器（CAN Transceiver）：CAN 收发器将 CAN 控制器连接到物理的 CAN 电缆上，将控制器的数据转换为 CAN 总线系统的差分信号，并反之亦然。它还提供电气保护

### 3.2 类型简介
- MCU内置CAN控制器
  - 许多微控制器（如 STM32、NXP S32、Infineon AURIX）集成了CAN/CAN FD控制器，可直接与外部收发器连接。
  - 优势：实时性强、资源可控、适合嵌入式ECU；需设计硬件收发器与布线。
- 独立CAN控制器 + 收发器
  - 典型控制器：MCP2515（SPI接口）、MCP2517FD/2518FD（支持CAN FD），通过SPI与主机MCU通信。
  - 收发器示例：TJA1042/TJA1051、SN65HVD系列等，负责差分物理层。
  - 适用：无内置CAN的MCU/主控，通过SPI扩展CAN功能。
- USB（或PCIe）CAN适配器
  - 厂商设备：Kvaser、PEAK-PCAN、IXXAT、ZLG等，提供Windows/Linux驱动与API，部分支持SocketCAN。
  - 优势：即插即用，适合PC上开发、调试与数据采集；型号覆盖Classical CAN与CAN FD。
- 车载以太网到CAN网关/桥接设备
  - 用于在车载以太网与CAN网络间转发消息或做协议转换（如J1939/UDS透传），方便混合网络架构。
- 诊断与测试工具
  - 总线分析仪/示波器：观察CAN_H/CAN_L波形、采样点与EMI问题。
  - 记录器与数据采集：车载数据记录、事件触发与长时间稳定性测试。
- 布线与配件
  - 双绞线与终端电阻（典型120Ω）：确保总线阻抗匹配与反射控制。
  - 接头与线束：汽车线束标准接口、分支长度控制以保证信号质量。

- 选型建议
  - 实验室与开发：优先USB-CAN适配器（支持SocketCAN）+ 示波器/分析仪，快速验证协议与应用。
  - 量产ECU：MCU内置CAN控制器 + 车规级收发器，严格EMC/ESD与热设计。
  - 高速与大负载：考虑CAN FD控制器与收发器，合理设置位时序与EMC设计。

## 4 工作原理详解

### 4.1 物理层和数据链路层

![](https://www.csselectronics.com/cdn/shop/files/can-bus-osi-model-7-layer-iso-11898-physical-data.svg)

#### 4.1.1 物理层
CAN总线的物理层定义了线缆类型、电气信号电平、节点要求、线缆阻抗等。例如，物理层规定如下：

- 波特率：节点必须通过双线总线连接，波特率最高可达1 Mbit/s（经典CAN）或8 Mbit/s（CAN FD）。
- 线缆长度：CAN线缆的最大长度应在500米（125 kbit/s）和40米（1 Mbit/s）之间。
- 终端电阻：CAN总线必须在总线两端使用120欧姆的终端电阻进行终端。

#### 4.1.2 数据链路层
CAN总线数据链路层定义了例如CAN帧格式、错误处理、数据传输，并有助于确保数据完整性。例如，数据链路层规定了：

- 帧格式：四种类型（数据帧、远程帧、错误帧、过载帧）和11位/29位标识符
- 错误处理：检测/处理CAN错误的方法，包括CRC、确认槽、错误计数器等
- 仲裁：非破坏性位仲裁有助于管理CAN总线访问并避免通过ID优先级产生的冲突

### 4.2 帧类型与结构
![](https://canlogger1000.csselectronics.com/img/CAN-bus-frame-standard-message-SOF-ID-RTR-Control-Data-CRC-ACK-EOF.svg)

经典数据帧关键字段：

- SOF (Start of Frame) - 帧起始: 帧起始是一个“显性 0”，用于告知其他节点有 CAN 节点准备开始通信。
- ID (Identifier) - 标识符: 标识符是帧的身份识别码——数值越小，优先级越高。
- RTR (Remote Transmission Request) - 远程传输请求: 远程传输请求指示一个节点是发送数据还是向另一个节点请求指定数据。
- Control - 控制场: 控制场包含标识符扩展位 (IDE)，对于 11 位标识符来说，它是一个“显性 0”。它还包含 4 位数据长度码 (DLC)，用于指定要传输的数据字节的长度（0 到 8 字节）。
- Data - 数据场: 数据场包含数据字节，即有效载荷，其中包括可以解码以获取信息的 CAN 信号。
- CRC (Cyclic Redundancy Check) - 循环冗余校验: 循环冗余校验用于确保数据的完整性。
- ACK (Acknowledgement) - 确认场: 确认场槽位指示节点是否已确认并正确接收数据。
- EOF (End of Frame) - 帧结束: 帧结束标志着 CAN 帧的末尾。

Classical CAN主要帧类型：
- 数据帧（Data Frame）：标准ID（11位）或扩展ID（29位），承载应用数据
- 远程帧（Remote Frame）：请求某个ID节点发送数据帧（现代系统较少使用）
- 错误帧（Error Frame）：节点检测到错误后发送，促使网络重传
- 过载帧（Overload Frame）：延迟下一个帧的开始（较少使用）

CAN FD在仲裁阶段与Classical CAN兼容，允许在数据阶段提升比特率并支持更长数据载荷（最多64字节）。


### 4.3 总线仲裁与冲突避免

- 多主访问（Multi-master）：所有节点在总线空闲（Intermission后为Bus Idle）时可尝试发送，CAN无中心主站，节点平等。

- CSMA/CR：载波侦听多路访问/冲突解决（Carrier Sense Multiple Access with Collision Resolution）。节点在发送期间持续监听总线电平，通过位级“显性覆盖隐性”的规则实现无碰撞仲裁。

仲裁工作原理（按位比较、确定性优先级）：
- 显性与隐性电平：
  - 显性（Dominant，逻辑0）覆盖隐性（Recessive，逻辑1）。任何节点输出显性时，总线观测到的就是显性。
  - 仲裁期间，每个节点发送一位同时采样总线；若节点输出的是隐性，但采样到的是显性，说明有更高优先级帧在发送，本节点立即停止发送（Arbitration Lost），等待本帧结束后重试。
- 仲裁发生在仲裁字段（Arbitration Field）：
  - 标准帧（11位ID）：SOF后紧接着的11位ID参与仲裁；在标准数据帧中，紧随其后的RTR=0（显性，表示数据帧）不会影响已经由ID决定的优先级排序。
  - 扩展帧（29位ID，CAN 2.0B）：包含11位基本ID、SRR（隐性保留远程请求）、IDE（隐性表示扩展格式）、以及18位扩展ID。扩展格式的IDE为隐性，因此在与标准帧竞争时，标准帧（IDE显性）在IDE位处胜出，优先级更高；扩展帧之间的优先级由完整的29位ID按位比较决定。
- 优先级规则：ID值越小（从最高有效位开始，更靠前出现显性0的比例更高）优先级越高；因此紧急/关键消息应分配更小的ID。
- 仲裁后的行为：
  - 获胜者继续发送后续字段（控制、数据、CRC、ACK、EOF）。
  - 失去仲裁的节点退回为接收状态，继续监听当前帧，待总线再次空闲后自动重试，无需软件介入和随机回退。

优势与注意事项：
- 优势：无需随机退避，硬件位级仲裁，高确定性、低延迟；适合实时控制与安全关键场景。
- 公平性与饥饿：高优先级帧连续出现可能导致低优先级帧饥饿（长期无法发送）。缓解手段包括：
  - 设计ID策略时避免过于激进的高优先级占用；
  - 在应用层引入限流/时间片或将非关键消息放入次级周期；
  - 使用网关或混合总线分担负载。
- 总线负载影响：高负载下，低优先级帧的访问延迟增大；系统设计需评估Worst-case Arbitration Delay。

示例（标准11位ID仲裁）：
- 节点A欲发送ID=0x100（0001 0000 0000），节点B欲发送ID=0x080（0000 1000 0000）。逐位比较：在第4位处，B仍为显性0而A为隐性1，B胜出继续发送；A检测到不一致后停止，等待B帧结束再重试。

术语与字段解释：
- Arbitration Field：用于决定优先级的ID及相关控制位组合（标准/扩展格式不同）。
- SRR（Substitute Remote Request）：扩展帧中的隐性位，用于与标准帧仲裁兼容。
- IDE（Identifier Extension）：格式指示；显性0表示标准帧，隐性1表示扩展帧。
- Dominant/Recessive：显性逻辑0、隐性逻辑1的总线电平语义；显性覆盖隐性。
- Intermission/Bus Idle：EOF后的帧间隔与空闲检测阶段；空闲后节点可发起新的SOF参与仲裁。
- Arbitration Lost：节点在仲裁中检测到自身隐性被显性覆盖而停止发送的事件；通常记录在控制器状态寄存器，便于诊断与统计。



### 4.4 错误检测与容错

CAN提供多层次错误检测：
- 位错误：非仲裁阶段发送方检测到总线位与自身发送位不一致
- 填充错误：位填充规则违规
- CRC错误：校验不匹配
- 形成错误：帧格式违反规范（如EOF阶段错误）
- ACK错误：未收到显性ACK

每个节点维护错误计数器（发送/接收），状态机包括：
- Error Active：正常状态，主动错误帧（显性错误标志）
- Error Passive：错误计数升高后进入，被动错误帧（隐性错误标志）
- Bus-off：严重错误时强制离线，需要应用或硬件复位/等待条件恢复

该机制使CAN在电磁干扰、线缆问题、设备故障情况下仍具高可靠性。

### 4.5 数据包发送与接收流程

- 发送路径（应用到总线）
  - 应用层构造消息：确定仲裁ID（11/29位）、数据长度DLC与数据载荷（Classical CAN 0–8字节，CAN FD可至64字节）。
  - 控制器队列：驱动/控制器将待发帧排入发送队列，若总线空闲则开始发送；否则等待空闲并参与仲裁。
  - 总线空闲检测与SOF：检测到总线处于空闲后输出SOF（显性位），进入仲裁阶段。
  - 仲裁阶段：按位发送仲裁字段；若本节点发送隐性而监听到显性，立即退出发送（失去仲裁），等待下一次总线空闲再重试。
  - 位填充与数据段：在控制、数据、CRC字段中执行位填充（连续5个同值位插入相反位），确保接收时钟恢复与健壮性。
  - CRC与ACK：发送CRC序列后进入ACK槽；正确接收的节点在ACK槽驱动显性位，发送方检测到显性即认为被至少一个节点接收。
  - EOF与间隔：发送EOF与帧间隔（Intermission），帧完成。若ACK错误或其他错误，控制器按错误管理策略进行重传或进入错误状态。

- 接收路径（总线到应用）
  - 监听与采样：所有节点在发送与空闲期间都监听总线位流，按既定采样点与位时序恢复比特。
  - 错误检测：检查位填充、格式、CRC与ACK条件；若错误则发出错误帧并丢弃该帧。
  - 过滤与递交：通过硬件/驱动过滤器（ID+掩码）筛选目标消息；匹配的帧进入接收FIFO，递交到应用或上层协议栈。
  - 上层解码：
    - 原始CAN：应用直接按ID映射含义（如信号表/DBC解析）。
    - ISO-TP/UDS：传输层进行分段重组与流控，再由诊断/应用层处理服务与数据。
    - CANopen/J1939：根据节点ID、PDO/SDO映射或PGN/地址字段进行语义解析与点对点/广播处理。
![](https://canlogger1000.csselectronics.com/img/CANopen-OSI-model-7-layer-standards-401-402-CiA-301-302.svg)

- 时序与健壮性注意事项
  - 优先级规划：为关键控制消息分配更高优先级（更小ID），保证在冲突场景下的确定性时延。
  - 位时序参数：合理配置采样点、TSEG1/TSEG2、SJW，提升抗抖动与EMI能力；必要时降低比特率。
  - 错误与重传：关注错误计数器变化与bus-off恢复策略，避免因持续错误导致节点离线；记录诊断日志便于定位布线/干扰问题。
  - 过滤策略：用硬件过滤降低CPU负担，并在应用层建立明确的ID-信号字典或PGN表，避免歧义与冲突。


## 5 CAN与以太网对比

- 速率与负载
  - CAN：Classical最高1 Mbps，CAN FD数据段可至2–5 Mbps；单帧负载小（8/64字节）
  - 以太网：10/100/1000 Mbps及更高；帧负载大，适配IP/TCP/UDP等协议
- 实时性与确定性
  - CAN：优先级仲裁与短帧，天然适合硬实时控制与广播状态
  - 以太网：高吞吐；需TSN等机制提升确定性与时延可控性
- 拓扑与布线（含连接器）
  - CAN：总线型，双绞线，端点需120Ω终端；车载线束专用接头
  - 以太网：星型/交换式，需交换机/PHY；RJ45或车载以太网连接器（H-MTD、MATEnet）
- 物理层与器件（介质/PHY/收发器）
  - CAN：差分信号（CAN_H/CAN_L），使用专用CAN收发器（如TJA1042、SN65HVD）
  - 以太网：不同介质与编码（如PAM3/NRZ），使用以太网PHY（如100BASE-T1/1000BASE-T1）
- 鲁棒性与EMC（含错误处理）
  - CAN：硬件级错误检测、自动重传，车规收发器与布线强化共模抑制与抗EMI
  - 以太网：帧CRC与上层重传；依赖屏蔽双绞线、磁性器件与PHY抗噪，车载以太网需严格EMC设计
- 成本与功耗
  - CAN：收发器与布线成本低、功耗小，适合大规模控制面部署
  - 以太网：PHY/交换设备成本与功耗更高，但带宽与生态更丰富
- 调试与工具
  - CAN：总线分析仪、示波器、USB-CAN适配器
  - 以太网：协议分析仪、抓包（Wireshark）、交换机/路由器配置与管理

- 适用场景
  - CAN：ECU间周期状态、命令控制、传感器/执行器网络
  - 以太网：高带宽传感器（摄像头、雷达）、OTA更新、诊断、信息娱乐

结论：在车载与工业控制中，CAN适合低带宽但强实时与高可靠需求的控制面；以太网适合高吞吐与复杂数据交互。现代系统常采用“CAN + 以太网”混合架构。


## 6 仿真实现与开发实践

### 6.1 开发环境选择

- Linux：推荐使用 SocketCAN（内核原生支持），配合 `python-can`、`candump`、`canplayer`、`cangen` 等工具。
- Windows/macOS：依赖供应商驱动或虚拟接口；`python-can`提供多种后端（socketcan、kvaser、pcan、nican等）。

### 6.2 使用python-can进行仿真

在Linux上，若无物理CAN硬件，可使用虚拟接口 `vcan` 进行仿真。

#### 6.2.1 准备vcan接口（Linux）

以下命令创建并启动虚拟CAN接口（需要管理员权限）：
```
modprobe vcan
ip link add dev vcan0 type vcan
ip link set up vcan0
```

可用 `ip link` 检查接口状态；也可用 `candump vcan0` 监听。

#### 6.2.2 python-can基本发送/接收

以下示例在 `vcan0` 上发送与接收数据帧。根据实际环境调整通道名称与后端。

```
import can
import time
from threading import Thread

def receiver(channel="vcan0", bustype="socketcan"):
    bus = can.interface.Bus(channel=channel, bustype=bustype)
    print("Receiver started on", channel)
    while True:
        msg = bus.recv(timeout=1.0)
        if msg is None:
            continue
        print(f"RX id=0x{msg.arbitration_id:X} dlc={msg.dlc} data={msg.data.hex()}")

def sender(channel="vcan0", bustype="socketcan"):
    bus = can.interface.Bus(channel=channel, bustype=bustype)
    for i in range(10):
        data = bytes([i, i+1, i+2, i+3, 0xAA, 0x55, 0x00, 0xFF])
        msg = can.Message(arbitration_id=0x123, data=data, is_extended_id=False)
        try:
            bus.send(msg, timeout=0.2)
            print(f"TX {i}: id=0x{msg.arbitration_id:X} data={data.hex()}")
        except can.CanError as e:
            print("TX failed:", e)
        time.sleep(0.1)

if __name__ == "__main__":
    t = Thread(target=receiver, daemon=True)
    t.start()
    sender()
    print("Done")
```

要点：
- `arbitration_id` 决定帧优先级；在真实网络中应合理规划ID范围。
- `dlc` 表示数据长度（0–8），CAN FD环境可延伸至64。
- 接收使用 `bus.recv()`，可设置超时防止阻塞。
- 在Windows或非SocketCAN环境，选择对应 `bustype`（如 `pcan`、`kvaser`、`nican`），并安装厂商驱动。

#### 6.2.3 过滤与回环测试

硬件/驱动层过滤可为接收端设置过滤器，提高效率。示例：

```
import can

bus = can.interface.Bus(channel="vcan0", bustype="socketcan")
## 只接收ID为0x100~0x1FF范围
bus.set_filters([
    {"can_id": 0x100, "can_mask": 0x700, "extended": False},
])

print("Listening with filters...")
while True:
    msg = bus.recv(timeout=1.0)
    if msg:
        print(f"RX id=0x{msg.arbitration_id:X} data={msg.data.hex()}")
```

#### 6.2.4 ISO-TP长报文仿真

使用 `isotp` 与 `python-can` 可模拟长报文传输。基本思路：
- 绑定底层CAN通道（如 `vcan0`）
- 配置单帧/多帧、分段与流控参数
- 在UDS诊断应用中常见（如读取DTC、ECU标定）

示意（伪代码）：
```
## pip install python-can isotp
import can
import isotp

can_bus = can.interface.Bus(channel='vcan0', bustype='socketcan')
stack = isotp.CanStack(bus=can_bus,
                       address=isotp.Address(isotp.AddressingMode.Normal_11bits, txid=0x7E0, rxid=0x7E8))

data = bytes(range(32))  ## 超过8字节
stack.send(data)

while True:
    stack.process()  ## 轮询处理
    payload = stack.recv()
    if payload:
        print("Received:", payload)
        break
```

### 6.3 vcan物理接收过程与调试方案

- 物理接收路径（在vcan上的抽象）
  - vcan是内核提供的虚拟CAN设备，模拟CAN控制器的接收与发送逻辑，但不涉及真实物理差分信号。
  - 发送端写入的帧通过内核SocketCAN路径分发到vcan设备；接收端驱动在位级时序上由内核模拟，不会出现物理层EMI、电缆反射等问题。
  - 即使没有真实物理线路，链路层机制仍有效：仲裁在vcan中由内核调度保证同一接口上不会产生冲突；位填充、CRC校验与ACK语义由协议栈实现或校验（不同实现可能省略ACK电气行为，但语义保持）。

- 使用candump观察接收过程
  - 监听接口：`candump vcan0`
  - 输出格式包含时间戳、接口名、ID与数据字节，便于核对DLC与负载。
  - 配合`cangen vcan0`可快速生成随机帧，测试接收负载与过滤效果。

- 路径与trace调试
  - 打开SocketCAN原始报文trace：
    - 使用`ip -details -statistics link show vcan0`查看接口统计（RX/TX计数、丢包、错误）。
    - 使用`sudo dmesg -w`实时查看内核日志，定位驱动层异常。
  - 在应用层开启详细日志：
    - `python-can`可设置`Logger`级别为DEBUG，打印send/recv事件与错误。
    - 为关键路径添加消息序列号与时间戳，计算端到端延迟与抖动。

- 丢包与错误定位
  - 接收FIFO溢出：高负载下，若应用处理不及时，可能在虚拟设备层出现排队丢弃。提升应用消费速率或增加接收队列长度（某些后端可调）。
  - 过滤器误配：ID掩码不当导致期望帧未递交，检查`bus.set_filters`配置。
  - 上层解析错误：DBC/PGN映射错误或端序处理不当，导致数据看似异常。
  - 计时与超时：`recv(timeout=...)`过短会造成逻辑“丢包”，适当放宽或用异步回调。

- 性能与时序检查
  - 吞吐压测：用`cangen -g 0 -L 8 -I 0x123 vcan0`持续满速发送，测量应用端处理速率。
  - 延迟测量：在发送与接收处打时间戳，计算往返与端到端延迟；vcan环境下应稳定小抖动。
  - 优先级与仲裁：在多个发送者同时发送时，检查低ID帧是否稳定先行；若使用多进程/线程，观察调度对时间序列的影响。
  - 长报文（ISO-TP）：测试分段与流控配置，验证无丢段、重组正确；使用`isotp`的诊断示例进行压力测试。

- 典型调试脚本片段（接收侧）
```
import can
import time

bus = can.interface.Bus(channel="vcan0", bustype="socketcan")
bus.set_filters([{"can_id": 0x000, "can_mask": 0x000, "extended": False}])  # 接收所有标准帧

count = 0
start = time.time()
while True:
    msg = bus.recv(timeout=1.0)
    if msg:
        count += 1
        print(f"{msg.timestamp:.6f} RX 0x{msg.arbitration_id:X} [{msg.dlc}] {msg.data.hex()}")
    if time.time() - start > 5:
        print("5s frames:", count)
        start = time.time()
        count = 0
```

- 结论
  - vcan消除了物理层不确定性，适合验证链路层与应用层逻辑、过滤策略、上层协议（ISO-TP/UDS/J1939）与性能基线。
  - 对物理问题（终端电阻、EMI、反射、采样点）需要在真实CAN硬件与线缆环境中进一步验证；vcan阶段可先完善软件栈与诊断工具链。

### 6.4 常见问题与调试建议

- 无法发送/接收：
  - 检查接口是否 up：`ip link set up vcan0`
  - 确认后端与通道匹配：`socketcan` 对应 Linux，`pcan`/`kvaser` 对应特定硬件
  - 硬件终端电阻与布线是否正确（物理总线）
- 总线错误频繁：
  - 查看错误计数与bus-off状态，降低速率、改善屏蔽与接地
  - 调整位时序（采样点、TSEG1/TSEG2）
- ID冲突与优先级：
  - 建立统一的ID规划表，避免关键控制消息被低优先级占用
- 长报文与诊断：
  - 使用ISO-TP，注意分段尺寸与流控节奏；避免阻塞控制面


## 7 文档资料

1. CCS Electronics. CAN Bus Simple Intro & Tutorial. https://www.csselectronics.com/pages/can-bus-simple-intro-tutorial (访问日期：2025-12-05).

2. The CAN Bus Companion. ISBN: 978-3-89576-541-4.
