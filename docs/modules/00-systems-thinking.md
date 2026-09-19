# 0. 为啥需要 MLSys？

> 状态：初稿。Part 0 · Systems Thinking for ML。本章是课程序章，使用连续故事建立共同问题与调查方法，不套用后续章节的完整实验模板。

假设你是一个刚入职不久的工程师。

某天，老板在会议上刷到了某个最新最炫的 DeepSeek 模型。

他突然沉默了三分钟，然后把一个听起来很大的任务，压缩成了一句听起来很小的话：

> “不用搞那么复杂，先在你电脑上搞一个出来看看。”

会议室里没人说话。

同事们不约而同地看向一脸茫然的你。

你无奈地回到工位，看了一眼桌子下面那台电脑：

```text
CPU: AMD Ryzen 7 9700X
RAM: 64 GB DDR5
GPU: NVIDIA GeForce RTX 5070 12 GB
SSD: 2 TB NVMe SSD
```

这台机器的配置不差。过去半年，它最重的活大概只是同时开着浏览器、Excel、企业微信和几个一直不能关的 OA 页面。

“先跑起来看看”倒不难。查几页文档，再问几次 ChatGPT，不到半小时，你拼出了人生中第一个“大模型平台”：

```python
from transformers import AutoTokenizer, AutoModelForCausalLM

model_name = "Qwen/Qwen3-4B"

tokenizer = AutoTokenizer.from_pretrained(model_name)

model = AutoModelForCausalLM.from_pretrained(
    model_name,
    device_map="auto",
    torch_dtype="auto"
)

messages = [
    {
        "role": "user",
        "content": "请用两句话介绍一下我们单位为什么应该重视人工智能。"
    }
]

text = tokenizer.apply_chat_template(
    messages,
    tokenize=False,
    add_generation_prompt=True
)

inputs = tokenizer(
    text,
    return_tensors="pt"
).to(model.device)

outputs = model.generate(
    **inputs,
    max_new_tokens=128
)

answer = tokenizer.decode(
    outputs[0][inputs["input_ids"].shape[1]:],
    skip_special_tokens=True
)

print(answer)
```

模型下载完，载入显存，等了一会儿，终端里真的开始往外吐字。

领导很快来验收。早上还只是一句话的需求，现在已经在桌下这台主机上跑起来了：

![从领导提出本地部署需求，到模型成功运行，再到要求部门试用的三格故事图](/images/modules/00/office-ai-request.svg)

<small>很多 ML system 的故事都从一句“先在你电脑上试试”开始。<sup>[[3]](#ref-course-diagrams)</sup></small>

模型开源，运行在本机，数据也没有发出去。领导听完“开源”和“本地”，很满意。你刚准备松口气，他又补了一句：

> “那你整理一下，明天给部门里的人也试试。”

## 0.1 昨天你有一个模型，今天你有一个服务

第二天早上，你给模型套了一层 API。总不能让每个同事都搬着椅子坐到你的工位旁，在终端里输入 prompt。你写了一个简单的 FastAPI 服务：

```python
from fastapi import FastAPI
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForCausalLM

app = FastAPI()

model_name = "Qwen/Qwen3-4B"

tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    device_map="auto",
    torch_dtype="auto"
)

class ChatRequest(BaseModel):
    prompt: str

@app.post("/chat")
def chat(request: ChatRequest):
    messages = [
        {"role": "user", "content": request.prompt}
    ]

    text = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True
    )

    inputs = tokenizer(
        text,
        return_tensors="pt"
    ).to(model.device)

    outputs = model.generate(
        **inputs,
        max_new_tokens=128
    )

    answer = tokenizer.decode(
        outputs[0][inputs["input_ids"].shape[1]:],
        skip_special_tokens=True
    )

    return {"answer": answer}
```

先在本机验证：

> **Cookbook · 本地演示**：下面的服务只监听回环地址，避免把一个没有认证和访问控制的接口直接暴露到局域网或公网。

```bash
pip install fastapi uvicorn transformers torch

uvicorn app:app --host 127.0.0.1 --port 8000
```

你可以先在同一台电脑上请求它：

```bash
curl -X POST http://127.0.0.1:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt":"请帮我写一段年度工作总结"}'
```

得到：

```json
{
  "answer": "过去一年，在部门领导的正确指导下……"
}
```

如果要让部门里的同事访问，还需要明确网络边界，并补上认证、限流、日志和输入约束。为了继续观察并发带来的系统问题，下面暂时假设这些入口层能力已经存在。

昨天能在终端里调用的模型，今天成了一个 HTTP 服务。到这里，事情仍然不算复杂。

## 0.2 然后，真的有人用了

第二天上午十点，同事们真的用起来了。

有人让它写年度工作总结，有人拿材料来润色，还有人要它把一段话写得正式一些。前几个请求很快返回，群里的反馈也不错。你看着消息，已经开始想象这件事写进年终总结会是什么样子。

第三个人、第四个人和第五个人几乎同时点下发送以后，情况变了。

有人在群里 @ 你：

> “是不是卡了？”

另一个人说：

> “我这边转半天了。”

还有人说：

> “刚才不是挺快的吗？”

你打开监控。服务没挂，程序没有报错，GPU 和 CPU 都很忙，显存也占了不少。昨天还让领导满意的小模型仍在工作，只是排队的请求越来越多。看起来，每生成一个 token 都要经历一次宇宙大爆炸：<sup>[[1]](#ref-galaxy-brain)</sup>

| 请求排到第几位 | 模型此刻的精神状态 |
| --- | --- |
| 第一个请求 | **思考。**<br><img src="/images/modules/00/galaxy-brain-m-stage-1.jpg" alt="Galaxy Brain 第一阶段：普通思考" width="320" loading="lazy"> |
| 第二个请求 | **顿悟。**<br><img src="/images/modules/00/galaxy-brain-m-stage-2.jpg" alt="Galaxy Brain 第二阶段：开始发光" width="320" loading="lazy"> |
| 第三个请求 | **升维。**<br><img src="/images/modules/00/galaxy-brain-m-stage-3.jpg" alt="Galaxy Brain 第三阶段：光芒四射" width="320" loading="lazy"> |
| 第四个请求 | **超越。**<br><img src="/images/modules/00/galaxy-brain-m-stage-4.jpg" alt="Galaxy Brain 第四阶段：进入宇宙" width="320" loading="lazy"> |
| 排在最后的请求 | **彻底过载。**<br><img src="/images/modules/00/galaxy-brain-m-stage-5.jpg" alt="Galaxy Brain 第五阶段：宇宙级顿悟" width="320" loading="lazy"> |

排在前面的请求可能很快就开始返回，后面的人却要等十几秒、几十秒，甚至更久。机器没有蓝屏，进程没有退出，API 还能连接，大部分请求最后也能得到答案。可在用户看来，结论已经很明确：

> 这玩意儿卡了。

昨天只有你一个人用，模型、代码和机器都很正常。今天唯一明显的变化，是同时多了几个人。这个变化为什么足以让服务变慢？

## 0.3 能跑起来以后，系统问题才刚开始

你把情况告诉领导：“现在人一多就会慢。”

领导想了一会儿：“那是不是机器不够？不过今年预算有点紧，你们搞技术的先优化优化嘛。”

你原本已经准备打开显卡报价，只好重新坐回电脑前。现在必须先回答一个看似简单的问题：

> **到底什么叫“慢”？**

是单个请求返回得太慢，还是单位时间内处理不了足够多的请求？为什么一个人使用时没问题，五个人一起用就开始排队？这些请求究竟在哪里等？

GPU 利用率到 100%，可能表示硬件得到了充分使用，也可能表示系统已经没有余量。反过来，30% 的利用率也不等于还有 70% 的性能可以白捡。即便换一张快两倍的显卡，整个服务也未必快两倍。一次处理多个请求通常能提高吞吐量，却可能让第一个请求多等一会儿，这同样需要取舍。

起初，你只想解决：

> **怎么让一个模型回答问题？**

现在要解决的是：

> **怎么让一个有限的计算机系统，在面对真实 workload 和现实约束时，持续把这件事做好？**

前一个问题关注模型调用，后一个问题包含 workload、资源约束和持续运行。刚开始时，我们眼里的世界只有：

```text
prompt
  ↓
model.generate()
  ↓
answer
```

模型真正被人使用以后，这个简单的箭头就展开了：

![一个模型服务从用户请求到 CPU、GPU、内存和显存的拓扑图](/images/modules/00/serving-request-topology.svg)

<small>图里的每一条边都可能藏着等待：请求可能在队列里等，运行时可能在准备 batch，GPU 可能在等数据，用户也可能在等第一个 token。<sup>[[3]](#ref-course-diagrams)</sup></small>

系统需要决定请求什么时候执行、哪些请求可以组成 batch、谁先执行，以及正在生成的请求是否会挡住后来者。它还要管理已经算过的状态、有限的显存，以及长短请求混在一起时的调度。

你开始运营的，已经是一个需要持续作出这些决定的系统。

## 0.4 “那直接用成熟的推理系统不就行了？”

当然可以。现实工作中，只要需求合适，就应该优先评估成熟系统，没有必要从零实现 inference engine。以 vLLM 为代表的系统，已经处理了 batching、KV Cache 管理和请求调度等大量工程问题。

换上成熟系统以后，服务也许立刻就快了。要判断它是否适合自己的 workload，仍然得知道时间减少在哪个阶段，吞吐提升来自更高效的执行还是更好的 batching，以及 KV Cache 为什么会成为需要调度的有限资源。长 prompt 会怎样影响其他请求？吞吐提高以后，交互延迟为什么可能恶化？这些问题不会因为换了框架而消失。

今天走进小红书、X 或其他 AI Infra 社区，很容易看到：

> 《vLLM 高频面试题》

> 《一文搞懂 PagedAttention》

> 《手撕 vLLM Scheduler》

> 《从源码看 XXX》

这些内容有价值，成熟系统的模块和源码也值得学习，后面的课程会在合适的位置观察它们。不过，成熟系统的模块顺序不适合作为理解系统的起点。

如果一开始就沿着框架结构学习，路径很容易变成：

```text
vLLM 架构图
  ↓
Scheduler
  ↓
Block Manager
  ↓
Model Runner
  ↓
PagedAttention
  ↓
记住它们分别做什么
```

这条路径直接给出答案，却藏起了答案要解决的问题。十年前，许多 Java 和 Spring Boot 培训也从 ApplicationContext、Bean 生命周期、AOP 和自动配置一路钻进源码调用链。学完后，学生可以背出每个类何时执行，却未必知道依赖管理、生命周期控制和横切逻辑分别回应了什么需求。今天把 Spring Boot 换成 vLLM，同一种学习顺序又出现了。

源码呈现的是成熟系统已经形成的答案。先看到问题，再去读答案，模块之间的关系才不容易变成八股文。这门课采用下面的顺序：

```text
真实问题
  ↓
观察与测量
  ↓
最朴素的实现
  ↓
问题逼出 batching、状态管理与调度
  ↓
轻量教学实现
  ↓
成熟生产系统
```

轻量教学实现帮助我们看清生产系统的骨架，vLLM 一类成熟系统提供真实工程样本。后续进入 LLM serving 时，我们会沿着具体的 workload 和测量结果讨论这些机制。课程把这个尺度称为：

> **Toy-scale, production-shaped.**

系统和模型可以很小，复现的问题要和真实系统具有相同的形状。

## 0.5 等一下，我们甚至还没有训练模型

到目前为止，我们还没有训练过一次模型。前面的 Qwen 是别人训练好的，我们一直只是在做：

```python
model = load_model(...)
model.generate(...)
```

ML 系统还要处理训练。同一种模型结构进入推理循环和训练循环时，机器承担的工作会明显改变：

![同一种模型结构分别进入推理和训练循环后，形成请求排队与训练状态两种不同 workload 的分叉图](/images/modules/00/inference-to-training.svg)

<small>代码看起来只是从生成切换到训练；系统看到的却是两套不同的执行目标、状态生命周期和资源压力。<sup>[[3]](#ref-course-diagrams)</sup></small>

推理主要处理请求到达、排队、延迟、吞吐和不断增长的 KV Cache。训练还要保存激活、梯度和优化器状态，执行反向传播，持续读取数据、同步梯度或分片状态，并保存 checkpoint。代码里看起来只是多了一个 `loss.backward()`，计算机面对的 workload 却已经不同。

最简单的训练循环可能只有几行：

```python
for batch in dataloader:
    optimizer.zero_grad()

    loss = model(batch)

    loss.backward()

    optimizer.step()
```

模型很小、数据很少时，这段代码运行得很好。接着把数字往上加：

> **把数字往上加。**

模型大一点，首先遇到的是显存不够。训练除了模型权重，还要保存梯度、激活、优化器状态和临时计算结果。一个推理时能塞进显存的模型，到了训练时可能直接报错：

```text
CUDA out of memory
```

一张 GPU 不够，可以换成八张，但八张 GPU 通常不会得到八倍速度。

多张 GPU 需要交换数据和同步，通信开始进入执行路径：

```text
compute
   ↓
communication
   ↓
compute
   ↓
communication
```

这时，PCIe、NVLink、NIC、RDMA、带宽、延迟和拓扑都会影响训练速度。模型继续变大，单台机器也放不下了：

```text
1 GPU
  ↓
8 GPUs
  ↓
8 machines
  ↓
64 machines
  ↓
1024 machines
```

![机器学习 workload 从一台办公电脑逐步扩大到多卡服务器、计算集群和数据中心的插图](/images/modules/00/desk-to-datacenter.svg)

<small>规模每跨过一层，新的主要矛盾就会出现：先是容量，然后是通信、调度、故障，最后是电力和物理基础设施。<sup>[[3]](#ref-course-diagrams)</sup></small>

集群扩大后，硬件故障不再稀奇。某张卡坏了、某个节点掉线，运行到第六天的训练都不能轻易从头再来，于是系统需要保存 checkpoint。可 checkpoint 自己可能有几百 GB，甚至更多。一千张 GPU 同时写入存储系统时，保存太频繁会拖慢训练，保存太少又可能在故障后损失几个小时。

这就带来了一个典型的系统取舍：

> **性能和可靠性之间怎么交换？**

数据规模也会带来类似的问题。刚开始，数据集可能只是：

```text
dataset/
    001
    002
    003
```

后来规模从 TB 增长到 PB，昂贵的 GPU 可能只能等着：

```text
GPU Utilization: 17%
```

瓶颈不在计算，而在数据还没到。存储、缓存、预取、shuffle、data loader 和 distributed filesystem 也随之进入系统。最初的“算梯度”，最终涉及计算、内存、通信、I/O 和可靠性。

## 0.6 课程的观察尺度：模型怎样成为 workload

到这里，可以说清楚这门课的边界。传统机器学习和深度学习课程通常会详细讨论：

- 数据收集与清洗；
- 标注；
- 数据增强；
- 模型结构；
- Loss；
- Optimizer；
- 超参数；
- 训练策略；
- SFT；
- preference optimization；
- RL；
- 各种后训练方法；
- 模型效果评估。

这些问题很重要；当它们显著改变系统行为时，本课程也会讨论。例如，不同训练方法会产生不同的显存占用、通信模式和计算模式。某些后训练流程同时包含 rollout、inference、training 和 weight synchronization，因而需要处理资源放置与调度。模型结构的变化也会改变计算和通信需求。

不过，本课程主要关注的不是：

> **如何调整模型，让它的 accuracy 再提高 1%？**

我们会问：

> **为了执行这一次训练或者推理，计算机系统实际上被要求做什么？**

因此，在分析系统行为时，我们经常暂时把模型看成一个：

> **workload generator。**

参数量、序列长度、batch size、模型结构、训练算法和推理策略，最终都会转化成对机器的一组需求：

![模型和算法配置被翻译为计算、内存、通信、I/O、同步和状态需求](/images/modules/00/workload-generator.svg)

<small>Systems 视角把模型选择继续向下翻译，直到它们成为机器实际承担的资源需求和执行约束。<sup>[[3]](#ref-course-diagrams)</sup></small>

一个 Transformer 首先是模型；从 Systems 视角看，它还会变成：

```text
GEMM
Attention
Memory Traffic
KV State
Communication
Synchronization
```

看到 DDP，我们也会继续追问：

```text
每张 GPU 在算什么？
什么时候通信？
通信多少？
谁在等待谁？
```

分析后训练时，我们会把算法名称展开成具体的执行过程：

```text
rollout
   ↓
inference workload
   ↓
evaluation / reward
   ↓
training workload
   ↓
weight synchronization
   ↓
rollout
```

本课程和传统 ML 教程观察的是同一个过程，只是视角关注的位置不同。传统机器学习课程更常问：

> **模型学到了什么？**

我们更多会问：

> **为了让它学到这些东西，机器究竟做了什么？**

两个问题分别对应模型行为和系统执行，是同一过程的两个层次。

## 0.7 把数字往上加，系统边界也会扩大

前面的故事有两条放大路径：用户从一个增加到五万个，GPU 从一张增加到上千张。

```text
1 user  →  5 users  →  500 users  →  50000 users
1 GPU   →  8 GPUs   →  64 GPUs    →  1024 GPUs
```

xkcd *What If?* 问过一个很适合说明规模的问题：如果地球上的所有人同时拿激光笔照向月球，月球会变色吗？<sup>[[2]](#ref-xkcd-laser)</sup>

普通激光笔没有效果。Randall Munroe 于是不断提高功率。给每个人一套 Luxor 探照灯，再用透镜把光束聚焦到月球，暗面终于被照亮，原问题已经得到肯定答案。可计算没有停下，功率继续增加，几毫瓦的玩具逐渐牵涉行星级能源，最后造成灾难性的物理后果。

<figure>
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; align-items: end;">
    <div>
      <img src="/images/modules/00/xkcd-laser-pointer-5mw.png" alt="数十亿人使用普通 5 毫瓦激光笔照射月球，月面看不出变化" loading="lazy">
      <p style="text-align: center; margin-top: 0.4rem;"><strong>5 mW / 人：</strong>什么也没发生。</p>
    </div>
    <div>
      <img src="/images/modules/00/xkcd-laser-pointer-luxor-lens.png" alt="聚焦后的 Luxor 探照灯让月球暗面从漆黑变得清晰可见" loading="lazy">
      <p style="text-align: center; margin-top: 0.4rem;"><strong>Luxor + 聚焦：</strong>暗面亮了。</p>
    </div>
    <div>
      <img src="/images/modules/00/xkcd-laser-pointer-terawatt.png" alt="数十亿人使用 500 太瓦激光照射月球，月球被推出画面" loading="lazy">
      <p style="text-align: center; margin-top: 0.4rem;"><strong>500 TW / 人：</strong>月球没了。</p>
    </div>
  </div>
  <figcaption>
    从没有效果，到真的照亮月球，再到月球本身成为问题：数字继续增加，连问题的边界也变了。
  </figcaption>
</figure>

规模增加以后，问题不会保持原样再简单乘上 N。只有一支激光笔时，没有人需要考虑地球能源系统。功率继续扩大，能源、散热、大气和材料依次进入问题，最后连月球本身也成了系统的一部分。ML Systems 的边界也会这样扩展。

### 从一个进程到许多台机器：机器之间也成了问题

推理服务从一个用户增加到五个用户时，batching、排队和请求调度出现了。用户增加到五百个、五万个以后，单个进程已经不够，副本、负载均衡、网络和故障开始决定服务是否可用。

训练只用一张 GPU 时，我们首先问：

> 模型放得下吗？

到了八张 GPU，需要考虑怎么切分计算。规模扩大到上百张，还要分析通信和等待；上千张 GPU 则把拓扑、存储、调度和故障一并带进系统边界。

此时，系统需要一整条相互配合的硬件路径：

- GPU 或其他加速器；
- HBM 与主机内存；
- 机架和服务器；
- NIC、交换机、光模块与高速互连；
- 本地与分布式存储；
- checkpoint、数据集和模型权重的传输路径。

许多张卡堆在一起，不会自动变成一台更大的计算机；许多服务进程摆在一起，也不会自动变成可靠的线上服务。拓扑、通信、调度和软件栈必须共同工作。

### 从许多张卡到数据中心：物理世界出现了

规模继续扩大，问题会越过服务器机箱：

> 电从哪里来？热怎么出去？网络怎么铺？光模块够不够？数据中心建在哪里？

GPU 需要真实的物理设施。一块加速卡进入集群之前，项目要先解决土地、园区、建筑、供电接入、变电设施、备用电源、冷却系统、消防系统和物理安全。于是，一开始只有一行代码的问题：

```python
model.generate(...)
```

最终会进入“水电还是核电”这样的讨论。现实项目确实已经到了这个尺度。2025 年 1 月，SoftBank 与 OpenAI 宣布牵头成立美国人工智能基础设施项目“星际之门”（Stargate Project），Oracle 和 MGX 也是初始出资方。项目最初宣布计划在四年内投入最高 5000 亿美元，并立即开始部署其中 1000 亿美元。SoftBank 主要承担财务责任，OpenAI 主要承担运营责任。<sup>[[4]](#ref-stargate-announcement)</sup>

“5000 亿美元”不是同等金额的 GPU 采购单，它覆盖了一条从资本和物理建设延伸到可用 AI 能力的基础设施链。

![Stargate 从资本组织、土地电力到芯片集群、系统运营和战略能力的五层结构图](/images/modules/00/stargate-infrastructure-stack.svg)

<small>数字继续放大时，资本组织、土地电力、芯片集群、系统运营和战略能力依次进入同一个问题。<sup>[[3]](#ref-course-diagrams)</sup></small>

当项目规模以 GW，也就是十亿瓦为单位讨论时，电力就从服务器规格表上的 TDP 变成一个选址条件：

> 这个地区的电网能不能支持项目存在？

Stargate 后续公布的规划更加直观。截至 2025 年 9 月，OpenAI 宣称已公布站点合计接近 7 GW 的规划容量，对应未来三年超过 4000 亿美元的投资规模，目标仍是最初承诺的 10 GW、5000 亿美元。<sup>[[5]](#ref-stargate-sites)</sup>

### 从数据中心到基础设施项目：组织也进入了系统

如此巨大的基础设施需要不同组织协作：融资和资本开支、数据中心建设、云与数据库基础设施、芯片、网络和软件栈，最后还要有人把这些资源组织成能够训练和服务模型的计算系统。

```text
资本
  ↓
项目公司
  ↓
数据中心开发商 / 云厂商 / 芯片厂商 / 网络设备商
  ↓
可被 workload 使用的计算基础设施
```

Stargate 的官方叙事同时讨论美国的 AI 领导地位、就业、再工业化、供应链和国家安全。规模扩大到这里，最初的 Python 脚本已经穿过机器、集群和数据中心，进入工业与国家战略的尺度。<sup>[[4]](#ref-stargate-announcement)</sup>

### 但把机器堆起来，还没有得到能力

这条放大链很容易让人形成一种线性想象：

```text
更多的钱
  ↓
更多的 GPU
  ↓
更大的数据中心
  ↓
更强的模型
```

有了楼、电和机器，项目获得的是资源。要把资源变成模型能力，还得决定训练 workload 放到哪些机器、模型如何并行、失败后如何恢复、数据如何持续供给，以及推理请求如何调度。训练、实验和线上服务还会争夺同一批资源。中间缺少的部分，就是 ML system。

Stargate 主要回答还能增加多少机器，以 DeepSeek-V3 为代表的国产模型与系统工作则说明另一件事：同样的机器可以完成多少有效工作？

DeepSeek-V3 的技术报告介绍了 MoE、FP8 训练、计算与通信重叠等设计，并报告完整训练使用约 278.8 万 H800 GPU 小时。这个数字并不小，但它表明模型能力还取决于模型结构、数值精度、并行策略、通信设计、负载均衡、训练框架，以及算法和硬件能否共同设计。<sup>[[6]](#ref-deepseek-v3)</sup>

可以把两者的关系概括为：

> **基础设施规模决定资源上限，系统效率决定我们离这个上限还有多远。**

效率提升和基础设施扩张可以同时发生。如果系统设计能让同样的机器完成更多工作，一座大型数据中心就能训练更多模型、服务更多用户，也能容纳更多实验。最终能力由资源规模和系统效率共同决定。

![扩大资源规模与提升系统效率两条路径共同决定最终可获得能力的对照图](/images/modules/00/scale-and-efficiency.svg)

<small>Stargate 主要抬高资源上限；DeepSeek 一类系统工作主要提高单位资源能够转化出的有效工作。最终能力同时受两者影响。<sup>[[3]](#ref-course-diagrams)</sup></small>

回头看，问题已经从：

```text
model.generate(...)
```

一路走到了：

```text
runtime → GPU → server → network → cluster → datacenter → power
```

数字每增加一次，新的约束就会进入系统边界。每进入一个新的尺度，我们还要判断怎样把新增资源转化成有效工作。因此需要同时回答：

> **我们能把系统做多大？又能让这个系统做多少有效工作？**

现代机器学习的能力，很难脱离整个计算系统单独讨论。

## 0.8 为什么需要 MLSys？

现在可以回答这一章的标题：为什么需要 Machine Learning Systems？

机器学习 workload 从 notebook 和单机走进生产环境，规模不断扩大。原本分散在计算机体系结构、操作系统、编译器、网络、分布式系统、存储、数据库、性能工程、调度、可靠性、控制和软件工程中的问题，开始同时出现。

机器学习没有让这些领域过时。它带来的 workload 庞大、昂贵、复杂，而且对执行条件十分挑剔，于是这些领域重新紧密地聚到一起。

这门课的目标也就很明确：我们不会用课程时间堆积 AI Infra 名词，而是练习一套能够迁移到新问题上的调查方法。

![从问题、观察和测量，到模型、机制、实验、取舍与决策，再回到测量的闭环流程](/images/modules/00/problem-driven-loop.svg)

<small>每个决策都会改变系统，下一轮调查仍要从观察与测量开始。<sup>[[3]](#ref-course-diagrams)</sup></small>

课程会用到 GPU、CUDA 或 ROCm、PyTorch、distributed training、Kubernetes 和 vLLM，也会阅读一部分源码。工具会更新，调查系统时要回答的问题更稳定。即使几年后流行框架已经换了一轮，你仍然需要问：

> 我的 workload 是什么？

> 系统真正慢在哪里？

> 我有什么证据？

> 时间花在了什么地方？

> 当前瓶颈是什么资源？

> 为什么这个机制有效？

> 它获得了什么，又牺牲了什么？

> 如果规模扩大十倍，现在的结论还成立吗？

学完这门课后，如果你碰到一个从未见过的新模型、新硬件或新系统，希望你先别搜索：

> 《XXX 高频面试题》

先问：

> **它到底给机器制造了什么 workload？**

接着观察、测量、建立模型并验证假设。能完成这套过程，比多背几十道 AI Infra 面试题更接近这门课的目标。

## 0.9 先测量，再优化

回到办公室。领导刚刚告诉你：

> “今年预算有点紧，你们技术先优化优化。”

桌子下面仍然只有：

```text
Ryzen 7 9700X
64 GB RAM
RTX 5070
```

以及一个单人使用正常、五个人一起用就开始卡的模型服务。

你可以换框架、调 batch、复制一份“vLLM 最佳实践”，把某个参数从 32 改成 64，或者打听 RTX 5090 的采购价格。采取这些动作之前，先回答：

> **你凭什么认为自己知道该优化哪里？**

如果不知道时间花在哪里、GPU 和 CPU 在做什么、数据在哪里等待，也不清楚用户关心的是 latency 还是 throughput，那么所谓“优化”很可能只是：

> 随机修改系统，直到 benchmark 看起来变好。

![工程师先用测量和证据定位瓶颈，而不是立即购买新 GPU 的插图](/images/modules/00/measure-before-upgrade.svg)

<small>采购和优化都可能是正确答案，选择哪一个取决于测量结果，不能只看监控页面里最显眼的百分比。<sup>[[3]](#ref-course-diagrams)</sup></small>

下一章先不买 GPU，也不拆 vLLM。我们从测量开始，看看这个系统到底在做什么。

## 图像与文献参考

1. <span id="ref-galaxy-brain"></span>Jon Manning，*High Resolution CC-0 Licensed Galaxy Brain Images*，Secret Lab Institute，2021。[原始模板与素材说明](https://secretlabinstitute.wordpress.com/2021/02/15/cc-0-licensed-galaxy-brain-images/)。本章使用其男性角色五阶段版本，并将图片缩放、转换为 JPEG。组合图以 CC0 发布；其中的 CC BY 素材包括 mahesh 的 [*Brain*](https://www.blendswap.com/blend/13180) 与 ESA/Hubble 的 [*Stellar nursery in the arms of NGC 1672*](https://esahubble.org/images/heic0706a/)，在此按原页面要求署名。
2. <span id="ref-xkcd-laser"></span>Randall Munroe，*Laser Pointer*，xkcd *What If?* #13。[原文](https://what-if.xkcd.com/13/)；[xkcd 许可说明](https://xkcd.com/license.html)。本章节选其中的 `laser_pointer_5mw.png`、`laser_pointer_luxor_lens.png` 与 `laser_pointer_terawatt.png`，未修改画面，依 CC BY-NC 2.5 用于非商业课程。
3. <span id="ref-course-diagrams"></span>本章使用的结构图与叙事插图均为本课程原创 SVG，包括办公室三格故事、推理与训练 workload 分叉、服务请求拓扑、workload 转译、问题驱动闭环、Stargate 基础设施栈、规模与效率对照，以及规模放大和测量场景插图。
4. <span id="ref-stargate-announcement"></span>OpenAI、SoftBank，*Announcing The Stargate Project*，2025-01-21。[官方公告](https://openai.com/index/announcing-the-stargate-project/)。
5. <span id="ref-stargate-sites"></span>OpenAI，*OpenAI, Oracle, and SoftBank Expand Stargate with Five New AI Data Center Sites*，2025-09-23。[官方进展公告](https://openai.com/index/five-new-stargate-sites/)。
6. <span id="ref-deepseek-v3"></span>DeepSeek-AI，*DeepSeek-V3 Technical Report*，arXiv:2412.19437，2024。[官方代码库与报告入口](https://github.com/deepseek-ai/DeepSeek-V3)。
