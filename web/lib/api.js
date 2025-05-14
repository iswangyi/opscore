/**
 * API 客户端工具，用于与后端服务交互
 */

// 基础 API URL，实际项目中应从环境变量获取
const API_BASE_URL = "http://172.27.153.18:8080/vmware/list/api"

// 模拟数据，用于在没有后端服务时提供数据
const MOCK_DATA = {
  clusters: [
    {
      id: "cluster-1",
      name: "生产集群",
      description: "生产环境 Kubernetes 集群",
      status: "connected",
      addedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      version: "v1.25.4",
    },
    {
      id: "cluster-2",
      name: "测试集群",
      description: "测试环境 Kubernetes 集群",
      status: "connected",
      addedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      version: "v1.26.1",
    },
    {
      id: "cluster-3",
      name: "开发集群",
      description: "开发环境 Kubernetes 集群",
      status: "error",
      addedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      version: "v1.27.0",
    },
  ],
  namespaces: [
    { name: "default" },
    { name: "kube-system" },
    { name: "kube-public" },
    { name: "production" },
    { name: "development" },
    { name: "monitoring" },
  ],
  pods: [
    {
      name: "nginx-deployment-6b474476c4-abcd1",
      namespace: "default",
      status: "Running",
      node: "worker-1",
      cpu: "10m",
      memory: "32Mi",
      age: "3d",
    },
    {
      name: "nginx-deployment-6b474476c4-abcd2",
      namespace: "default",
      status: "Running",
      node: "worker-2",
      cpu: "10m",
      memory: "32Mi",
      age: "3d",
    },
    {
      name: "mysql-0",
      namespace: "default",
      status: "Running",
      node: "worker-1",
      cpu: "100m",
      memory: "256Mi",
      age: "5d",
    },
    {
      name: "prometheus-server-0",
      namespace: "monitoring",
      status: "Running",
      node: "worker-3",
      cpu: "200m",
      memory: "512Mi",
      age: "1d",
    },
    {
      name: "grafana-deployment-5c88d67f-xyz12",
      namespace: "monitoring",
      status: "Running",
      node: "worker-2",
      cpu: "50m",
      memory: "128Mi",
      age: "1d",
    },
  ],
  deployments: [
    {
      name: "nginx-deployment",
      namespace: "default",
      replicas: "2/2",
      status: "Available",
      image: "nginx:1.19",
      age: "3d",
    },
    {
      name: "frontend-deployment",
      namespace: "production",
      replicas: "3/3",
      status: "Available",
      image: "frontend:v1.2.3",
      age: "2d",
    },
    {
      name: "backend-deployment",
      namespace: "production",
      replicas: "2/2",
      status: "Available",
      image: "backend:v1.0.5",
      age: "2d",
    },
    {
      name: "prometheus-deployment",
      namespace: "monitoring",
      replicas: "1/1",
      status: "Available",
      image: "prometheus:v2.30.0",
      age: "1d",
    },
    {
      name: "grafana-deployment",
      namespace: "monitoring",
      replicas: "1/1",
      status: "Available",
      image: "grafana:8.2.0",
      age: "1d",
    },
  ],
  services: [
    {
      name: "nginx-service",
      namespace: "default",
      type: "ClusterIP",
      clusterIP: "10.0.0.1",
      externalIP: "",
      ports: "80/TCP",
      age: "3d",
    },
    {
      name: "frontend-service",
      namespace: "production",
      type: "LoadBalancer",
      clusterIP: "10.0.0.2",
      externalIP: "34.123.45.67",
      ports: "80:30080/TCP",
      age: "2d",
    },
    {
      name: "backend-service",
      namespace: "production",
      type: "ClusterIP",
      clusterIP: "10.0.0.3",
      externalIP: "",
      ports: "8080/TCP",
      age: "2d",
    },
    {
      name: "prometheus-service",
      namespace: "monitoring",
      type: "ClusterIP",
      clusterIP: "10.0.0.4",
      externalIP: "",
      ports: "9090/TCP",
      age: "1d",
    },
    {
      name: "grafana-service",
      namespace: "monitoring",
      type: "ClusterIP",
      clusterIP: "10.0.0.5",
      externalIP: "",
      ports: "3000/TCP",
      age: "1d",
    },
  ],
  configMaps: [
    {
      name: "nginx-config",
      namespace: "default",
      data: "2 items",
      age: "3d",
    },
    {
      name: "app-config",
      namespace: "production",
      data: "5 items",
      age: "2d",
    },
    {
      name: "prometheus-config",
      namespace: "monitoring",
      data: "3 items",
      age: "1d",
    },
    {
      name: "grafana-config",
      namespace: "monitoring",
      data: "4 items",
      age: "1d",
    },
  ],
}

/**
 * 发送 API 请求
 * @param {string} endpoint - API 端点
 * @param {Object} options - 请求选项
 * @returns {Promise<any>} 响应数据
 */
async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`

  // 检查是否使用模拟数据
  const useMockData = true // 在实际项目中，可以根据环境变量设置

  if (useMockData) {
    console.log(`[模拟 API] ${options.method || "GET"} ${endpoint}`)
    return mockAPIResponse(endpoint, options)
  }

  // 默认请求头
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  }

  // 如果有认证令牌，添加到请求头
  const token = localStorage.getItem("auth-token")
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    })

    // 检查响应状态
    if (!response.ok) {
      // 尝试解析错误响应
      try {
        const errorData = await response.json()
        throw new Error(errorData.message || `API 请求失败: ${response.status}`)
      } catch (parseError) {
        // 如果无法解析 JSON，返回状态文本
        throw new Error(`API 请求失败: ${response.status} ${response.statusText}`)
      }
    }

    // 解析响应数据
    const data = await response.json()
    return data
  } catch (error) {
    console.error("API 请求错误:", error)

    // 如果是网络错误或服务器错误，尝试使用模拟数据
    console.log(`[回退到模拟数据] ${endpoint}`)
    return mockAPIResponse(endpoint, options)
  }
}

/**
 * 模拟 API 响应
 * @param {string} endpoint - API 端点
 * @param {Object} options - 请求选项
 * @returns {Promise<any>} 模拟响应数据
 */
function mockAPIResponse(endpoint, options = {}) {
  // 添加延迟以模拟网络请求
  return new Promise((resolve) => {
    setTimeout(() => {
      // 集群相关 API
      if (endpoint === "/clusters") {
        if (options.method === "POST") {
          // 添加集群
          const newCluster = JSON.parse(options.body)
          const cluster = {
            id: `cluster-${Date.now()}`,
            name: newCluster.name,
            description: newCluster.description || "",
            status: "connected",
            addedAt: new Date().toISOString(),
            version: "v1.25.0",
          }

          // 将新集群添加到本地存储
          const clusters = JSON.parse(localStorage.getItem("k8s-clusters") || "[]")
          clusters.push(cluster)
          localStorage.setItem("k8s-clusters", JSON.stringify(clusters))

          resolve(cluster)
        } else {
          // 获取集群列表
          const savedClusters = localStorage.getItem("k8s-clusters")
          resolve(savedClusters ? JSON.parse(savedClusters) : MOCK_DATA.clusters)
        }
      }
      // 集群详情 API
      else if (endpoint.match(/\/clusters\/[^/]+$/)) {
        const clusterId = endpoint.split("/").pop()
        const clusters = JSON.parse(localStorage.getItem("k8s-clusters") || "[]")
        const cluster = clusters.find((c) => c.id === clusterId) || MOCK_DATA.clusters.find((c) => c.id === clusterId)

        if (options.method === "DELETE") {
          // 删除集群
          const updatedClusters = clusters.filter((c) => c.id !== clusterId)
          localStorage.setItem("k8s-clusters", JSON.stringify(updatedClusters))
          resolve({ success: true })
        } else {
          // 获取集群详情
          resolve(cluster)
        }
      }
      // 测试集群连接 API
      else if (endpoint.match(/\/clusters\/[^/]+\/test$/)) {
        const clusterId = endpoint.split("/")[2]
        const clusters = JSON.parse(localStorage.getItem("k8s-clusters") || "[]")
        const cluster = clusters.find((c) => c.id === clusterId) || MOCK_DATA.clusters.find((c) => c.id === clusterId)

        if (cluster && cluster.status !== "error") {
          resolve({
            status: "success",
            version: cluster.version || "v1.25.0",
            nodes: 3,
            pods: 24,
            namespaces: 6,
          })
        } else {
          throw new Error("无法连接到集群，请检查配置")
        }
      }
      // 命名空间 API
      else if (endpoint.match(/\/kubernetes\/[^/]+\/namespaces$/)) {
        resolve(MOCK_DATA.namespaces)
      }
      // Pod API
      else if (endpoint.match(/\/kubernetes\/[^/]+\/namespaces\/[^/]+\/pods$/)) {
        const namespace = endpoint.split("/")[4]
        const pods = MOCK_DATA.pods.filter((pod) => (namespace === "all" ? true : pod.namespace === namespace))
        resolve(pods)
      }
      // Deployment API
      else if (endpoint.match(/\/kubernetes\/[^/]+\/namespaces\/[^/]+\/deployments$/)) {
        const namespace = endpoint.split("/")[4]
        const deployments = MOCK_DATA.deployments.filter((deployment) =>
          namespace === "all" ? true : deployment.namespace === namespace,
        )
        resolve(deployments)
      }
      // Service API
      else if (endpoint.match(/\/kubernetes\/[^/]+\/namespaces\/[^/]+\/services$/)) {
        const namespace = endpoint.split("/")[4]
        const services = MOCK_DATA.services.filter((service) =>
          namespace === "all" ? true : service.namespace === namespace,
        )
        resolve(services)
      }
      // ConfigMap API
      else if (endpoint.match(/\/kubernetes\/[^/]+\/namespaces\/[^/]+\/configmaps$/)) {
        const namespace = endpoint.split("/")[4]
        const configMaps = MOCK_DATA.configMaps.filter((configMap) =>
          namespace === "all" ? true : configMap.namespace === namespace,
        )
        resolve(configMaps)
      }
      // 终端命令 API
      else if (endpoint.match(/\/kubernetes\/[^/]+\/terminal$/)) {
        const command = JSON.parse(options.body).command
        const namespace = JSON.parse(options.body).namespace

        if (command.includes("help")) {
          resolve({
            output:
              "可用命令:\n  get [resource] - 获取资源列表\n  describe [resource] [name] - 查看资源详情\n  logs [pod] - 查看 Pod 日志\n  exec [pod] [command] - 在 Pod 中执行命令",
          })
        } else if (command.includes("get pods")) {
          const pods = MOCK_DATA.pods.filter((pod) => pod.namespace === namespace)
          let output = "NAME                                    READY   STATUS    RESTARTS   AGE\n"
          pods.forEach((pod) => {
            output += `${pod.name}   1/1     ${pod.status}    0          ${pod.age}\n`
          })
          resolve({ output })
        } else if (command.includes("get deployments")) {
          const deployments = MOCK_DATA.deployments.filter((d) => d.namespace === namespace)
          let output = "NAME                 READY   UP-TO-DATE   AVAILABLE   AGE\n"
          deployments.forEach((d) => {
            output += `${d.name}   ${d.replicas}    ${d.replicas.split("/")[0]}            ${d.replicas.split("/")[0]}           ${d.age}\n`
          })
          resolve({ output })
        } else if (command.includes("get services")) {
          const services = MOCK_DATA.services.filter((s) => s.namespace === namespace)
          let output = "NAME                 TYPE           CLUSTER-IP    EXTERNAL-IP    PORT(S)          AGE\n"
          services.forEach((s) => {
            output += `${s.name}   ${s.type}    ${s.clusterIP}    ${s.externalIP || "<none>"}    ${s.ports}    ${s.age}\n`
          })
          resolve({ output })
        } else {
          resolve({
            output: `执行命令: ${command} 在命名空间 ${namespace}\n模拟输出: 命令执行成功`,
          })
        }
      }
      // 默认返回空数据
      else {
        resolve({ message: "未找到匹配的模拟 API 端点" })
      }
    }, 500) // 500ms 延迟
  })
}

/**
 * 集群管理 API
 */
export const clustersAPI = {
  // 获取所有集群
  getAll: () => fetchAPI("/clusters"),

  // 获取单个集群
  getById: (clusterId) => fetchAPI(`/clusters/${clusterId}`),

  // 添加集群
  add: (clusterData) =>
    fetchAPI("/clusters", {
      method: "POST",
      body: JSON.stringify(clusterData),
    }),

  // 更新集群
  update: (clusterId, clusterData) =>
    fetchAPI(`/clusters/${clusterId}`, {
      method: "PUT",
      body: JSON.stringify(clusterData),
    }),

  // 删除集群
  delete: (clusterId) =>
    fetchAPI(`/clusters/${clusterId}`, {
      method: "DELETE",
    }),

  // 测试集群连接
  testConnection: (clusterId) =>
    fetchAPI(`/clusters/${clusterId}/test`, {
      method: "POST",
    }),
}

/**
 * Kubernetes 资源 API
 */
export const kubernetesAPI = {
  // 获取命名空间列表
  getNamespaces: (clusterId) => fetchAPI(`/kubernetes/${clusterId}/namespaces`),

  // 获取 Pod 列表
  getPods: (clusterId, namespace = "default") => fetchAPI(`/kubernetes/${clusterId}/namespaces/${namespace}/pods`),

  // 获取 Deployment 列表
  getDeployments: (clusterId, namespace = "default") =>
    fetchAPI(`/kubernetes/${clusterId}/namespaces/${namespace}/deployments`),

  // 获取 Service 列表
  getServices: (clusterId, namespace = "default") =>
    fetchAPI(`/kubernetes/${clusterId}/namespaces/${namespace}/services`),

  // 获取 ConfigMap 列表
  getConfigMaps: (clusterId, namespace = "default") =>
    fetchAPI(`/kubernetes/${clusterId}/namespaces/${namespace}/configmaps`),

  // 获取资源详情
  getResourceDetails: (clusterId, namespace, resourceType, resourceName) =>
    fetchAPI(`/kubernetes/${clusterId}/namespaces/${namespace}/${resourceType}/${resourceName}`),

  // 创建资源
  createResource: (clusterId, namespace, resourceType, resourceData) =>
    fetchAPI(`/kubernetes/${clusterId}/namespaces/${namespace}/${resourceType}`, {
      method: "POST",
      body: JSON.stringify(resourceData),
    }),

  // 更新资源
  updateResource: (clusterId, namespace, resourceType, resourceName, resourceData) =>
    fetchAPI(`/kubernetes/${clusterId}/namespaces/${namespace}/${resourceType}/${resourceName}`, {
      method: "PUT",
      body: JSON.stringify(resourceData),
    }),

  // 删除资源
  deleteResource: (clusterId, namespace, resourceType, resourceName) =>
    fetchAPI(`/kubernetes/${clusterId}/namespaces/${namespace}/${resourceType}/${resourceName}`, {
      method: "DELETE",
    }),

  // 执行终端命令
  executeCommand: (clusterId, namespace, command) =>
    fetchAPI(`/kubernetes/${clusterId}/terminal`, {
      method: "POST",
      body: JSON.stringify({ namespace, command }),
    }),

  // 获取 Pod 日志
  getPodLogs: (clusterId, namespace, podName, containerName = "") =>
    fetchAPI(
      `/kubernetes/${clusterId}/namespaces/${namespace}/pods/${podName}/logs${containerName ? `?container=${containerName}` : ""}`,
    ),
}
