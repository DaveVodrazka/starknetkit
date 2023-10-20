import type {
  AccountChangeEventHandler,
  StarknetWindowObject,
} from "get-starknet-core"
import { getStarknet } from "get-starknet-core"
import { AccountInterface } from "starknet"
import {
  ConnectorNotConnectedError,
  ConnectorNotFoundError,
  UserNotConnectedError,
  UserRejectedRequestError,
} from "../../errors"
import { Connector } from "../connector"

/** Injected connector options. */
export interface InjectedConnectorOptions {
  /** The wallet id. */
  id: string
}

export class InjectedConnector extends Connector {
  private _wallet?: StarknetWindowObject
  private _options: InjectedConnectorOptions

  constructor({ options }: { options: InjectedConnectorOptions }) {
    super()
    this._options = options
  }

  available(): boolean {
    this.ensureWallet()
    return this._wallet !== undefined
  }

  async ready(): Promise<boolean> {
    await this.ensureWallet()

    if (!this._wallet) {
      return false
    }
    return await this._wallet.isPreauthorized()
  }

  async connect(): Promise<AccountInterface> {
    await this.ensureWallet()

    if (!this._wallet) {
      throw new ConnectorNotFoundError()
    }

    try {
      await this._wallet.enable({ starknetVersion: "v5" })
    } catch {
      // NOTE: Argent v3.0.0 swallows the `.enable` call on reject, so this won't get hit.
      throw new UserRejectedRequestError()
    }

    if (!this._wallet.isConnected) {
      // NOTE: Argent v3.0.0 swallows the `.enable` call on reject, so this won't get hit.
      throw new UserRejectedRequestError()
    }

    // This is to ensure that v5 account interface is used.
    // TODO: add back once Braavos updates their interface.
    /*
    if (!(this._wallet.account instanceof AccountInterface)) {
      throw new UnsupportedAccountInterfaceError()
    }
    */

    return this._wallet.account
  }

  async disconnect(): Promise<void> {
    await this.ensureWallet()

    if (!this.available()) {
      throw new ConnectorNotFoundError()
    }

    if (!this._wallet?.isConnected) {
      throw new UserNotConnectedError()
    }
  }

  async account(): Promise<AccountInterface | null> {
    await this.ensureWallet()

    if (!this._wallet) {
      throw new ConnectorNotConnectedError()
    }

    if (!this._wallet.account) {
      return null
    }

    return this._wallet.account
  }

  get id(): string {
    return this._options.id
  }

  get name(): string {
    if (!this._wallet) {
      throw new ConnectorNotConnectedError()
    }
    return this._wallet.name
  }

  get icon(): string {
    if (!this._wallet) {
      throw new ConnectorNotConnectedError()
    }
    return this._wallet.icon
  }

  get wallet(): StarknetWindowObject {
    if (!this._wallet) {
      throw new ConnectorNotConnectedError()
    }
    return this._wallet
  }

  async initEventListener(accountChangeCb: AccountChangeEventHandler) {
    await this.ensureWallet()

    if (!this._wallet) {
      throw new ConnectorNotConnectedError()
    }

    this._wallet.on("accountsChanged", accountChangeCb)
  }

  async removeEventListener(accountChangeCb: AccountChangeEventHandler) {
    await this.ensureWallet()

    if (!this._wallet) {
      throw new ConnectorNotConnectedError()
    }

    this._wallet.off("accountsChanged", accountChangeCb)
  }

  private async ensureWallet() {
    const starknet = getStarknet()
    const installed = await starknet.getAvailableWallets()
    const wallet = installed.filter((w) => w.id === this._options.id)[0]
    if (wallet) {
      this._wallet = wallet
    }
  }
}
