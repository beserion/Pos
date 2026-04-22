using System;
using System.Collections.Generic;
using System.Text;
using System.Windows.Forms;
using System.Drawing;

using Inpos;
using static System.Windows.Forms.AxHost;
using System.Threading;
using System.Net.NetworkInformation;

namespace InposExtTest
{ 
    public partial class ExtTest : Form
    {
        private InposSaleReceipt receipt;
        private InposEcrMultipleSaleItems saleItems = new InposEcrMultipleSaleItems(0);
        private UInt32 timeout = 5000;
        private bool closing = false;

        private InposExt.EcrStateChangeCallback StateCallback;

        private void StateHandler(Int32 ecrState, Int32 saleState)
        {
            if (State.InvokeRequired)
            {
                State.BeginInvoke((MethodInvoker)delegate ()
                {
                    State.Text = "Yazarkasa: " + ((InposEcrState)ecrState).ToString() + " Satış: " + ((InposEcrSaleState)saleState).ToString();
                });
            }
            else
            {
                State.Text = "Yazarkasa: " + ((InposEcrState)ecrState).ToString() + " Satış: " + ((InposEcrSaleState)saleState).ToString();
            }
        }

        private static readonly Dictionary<Inpos.Unit, string> UnitNames = new Dictionary<Inpos.Unit, string>
        {
            { Inpos.Unit.Quantity,      "Adet" },
            { Inpos.Unit.Gram,          "Gram" },
            { Inpos.Unit.Kilogram,      "Kilogram" },
            { Inpos.Unit.Tonne,         "Ton" },
            { Inpos.Unit.Milliliter,    "Mililitre" },
            { Inpos.Unit.Liter,         "Litre" },
            { Inpos.Unit.Meter,         "Metre" },
            { Inpos.Unit.Kilometer,     "Kilometre" },
            { Inpos.Unit.Portion,       "Porsiyon" },
        };

        private static readonly Dictionary<Inpos.InvoiceType, string> InvoiceTypeNames = new Dictionary<Inpos.InvoiceType, string>
        {
            { Inpos.InvoiceType.Invoice,            "Fatura"},
            { Inpos.InvoiceType.EInvoice,           "E-Fatura"},
            { Inpos.InvoiceType.EArchiveInvoice,    "E-Arşiv Fatura"},
        };

        private static readonly Dictionary<Inpos.CustomerNoType, string> CustomerNoTypeNames = new Dictionary<Inpos.CustomerNoType, string>
        {
            { Inpos.CustomerNoType.Id,      "TCKN"},
            { Inpos.CustomerNoType.TaxNo,   "VKN"},            
        };

        private static readonly Dictionary<Inpos.InposSaleType, string> SaleTypeNames = new Dictionary<Inpos.InposSaleType, string>
        {
            {Inpos.InposSaleType.SaleWithReceiptType,   "Normal" },
            {Inpos.InposSaleType.SaleWithInvoiceType,   "Faturalı" },
            {Inpos.InposSaleType.SaleWithMealCardType,  "Yemek Kartı" },
            {Inpos.InposSaleType.AdvancePaymentType,    "Avans" },
            {Inpos.InposSaleType.DelayedPaymentType,    "Cari Hesap" },
        };

        private static readonly Dictionary<Inpos.PaymentType, string> PaymentTypeNames = new Dictionary<Inpos.PaymentType, string>
        {
            {Inpos.PaymentType.CashPayment,         "Nakit" },
            {Inpos.PaymentType.CreditCardPayment,   "Banka/Kredi Kartı" },
            {Inpos.PaymentType.MealCardPayment,     "Yemek Kartı" },
            {Inpos.PaymentType.CreditPayment,       "Kredili" },
            {Inpos.PaymentType.NoPayment,           "Veresiye" },
            {Inpos.PaymentType.OpenAccount,         "Açık Hesap" },
            {Inpos.PaymentType.MoneyTransfer,       "Havale/EFT" }
        };

        public ExtTest()
        {
            InitializeComponent();

            ListenIP.ValidatingType = typeof(System.Net.IPAddress);
        }

        private void Form1_Load(object sender, EventArgs e)
        {
            try
            {
                foreach (Inpos.Unit unit in Enum.GetValues(typeof(Inpos.Unit)))
                {
                    String name;

                    if(UnitNames.TryGetValue(unit, out name))
                        UnitComboBox.Items.Add(name);
                    else
                        UnitComboBox.Items.Add(unit.ToString());
                }

                UnitComboBox.SelectedIndex = 0;

                foreach (Inpos.InvoiceType type in Enum.GetValues(typeof(Inpos.InvoiceType)))
                {
                    String name;

                    if (InvoiceTypeNames.TryGetValue(type, out name))
                        InvoiceTypeComboBox.Items.Add(name);
                    else
                        InvoiceTypeComboBox.Items.Add(type.ToString());
                }

                InvoiceTypeComboBox.SelectedIndex = 0;

                foreach (Inpos.CustomerNoType type in Enum.GetValues(typeof(Inpos.CustomerNoType)))
                {
                    String name;

                    if (CustomerNoTypeNames.TryGetValue(type, out name))
                        CustomerNoTypeComboBox.Items.Add(name);
                    else
                        CustomerNoTypeComboBox.Items.Add(type.ToString());
                }

                CustomerNoTypeComboBox.SelectedIndex = 0;

                foreach (Inpos.InposSaleType type in Enum.GetValues(typeof(Inpos.InposSaleType)))
                {
                    String name;

                    if (SaleTypeNames.TryGetValue(type, out name))
                        SaleTypeComboBox.Items.Add(name);
                    else
                        SaleTypeComboBox.Items.Add(type.ToString());
                }

                SaleTypeComboBox.SelectedIndex = -1;

                foreach (Inpos.PaymentType type in Enum.GetValues(typeof(Inpos.PaymentType)))
                {
                    String name;

                    if (PaymentTypeNames.TryGetValue(type, out name))
                        PaymentTypeComboBox.Items.Add(name);
                    else
                        PaymentTypeComboBox.Items.Add(type.ToString());
                }

                PaymentTypeComboBox.SelectedIndex = -1;

                foreach (Inpos.Acquirer type in Enum.GetValues(typeof(Inpos.Acquirer)))
                {
                    //NOTE: Only Meal Card
                    if (Convert.ToInt32(type) > 10000)
                    {
                        PaymentAcquirerComboBox.Items.Add(type.ToString());
                    }
                }

                PaymentAcquirerComboBox.SelectedItem = -1;

                SlipCountComboBox.SelectedIndex = 0;

                Info.Text = "Bağlı değil.";
                VersionInfo.Text = "InposExt Sürümü: " + InposExt.Version();

                saleItems.count = 0;
                
                StateCallback = new InposExt.EcrStateChangeCallback(StateHandler);
                
            }
            catch (Exception exc)
            {
                MessageBox.Show(exc.Message);
            }
        }

        private void ExtTest_FormClosing(object sender, FormClosingEventArgs e)
        {
            closing = true;

			InposExt.CloseAll();
            Info.Text = "Bağlı değil.";
        }

        private void EcrSerialNoComboBox_KeyDown(object sender, KeyEventArgs e)
        {
            if (e.KeyData == Keys.Enter)
            {
                if (!EcrSerialNoComboBox.Items.Contains(EcrSerialNoComboBox.Text))
                {
                    EcrSerialNoComboBox.Items.Add(EcrSerialNoComboBox.Text);

                    EcrSerialNoComboBox_SelectedIndexChanged(sender, EventArgs.Empty);
                }
            }
        }

        private void EcrSerialNoComboBox_SelectedIndexChanged(object sender, EventArgs e)
        {
            String serialNo = EcrSerialNoComboBox.Text;

            if (String.IsNullOrEmpty(serialNo))
            {
                Info.Text = "Cihaz sicil no girilmemiş.";
                return;
            }

            if (serialNo.Length != 12)
            {
                Info.Text = "Cihaz sicil no geçerli değil.";
                return;
            }

            if (EcrSerialNoComboBox.Items.Count <= 1)
            {
                return;
            }

            InposExtError error = InposExt.SetActiveDevice(serialNo);

            if (error == InposExtError.InposNoError)
            {
                String sn = "";
                InposExt.ActiveDevice(out sn);
                Info.Text = "Etkin cihaz değiştirildi: " + sn;
            }
            else
            {
                Info.Text = "Etkin cihaz değiştirilemedi. " 
                          + "Hata: " + ((Int32)error).ToString() + " " + "(" + error.ToString() + ")" + "\n"
                          + ErrorDetailString();
            }
        }

        private void Initialize_Click(object sender, EventArgs e)
        {
            String serialNo = EcrSerialNoComboBox.Text;

            if (String.IsNullOrEmpty(serialNo))
            {
                Info.Text = "Cihaz sicil no girilmemiş.";
                return;
            }

            if (serialNo.Length != 12)
            {
                Info.Text = "Cihaz sicil no geçerli değil.";
                return;
            }

            Info.Text = "Cihaz bağlantısı bekleniyor...";
            Application.DoEvents();

            closing = false;

            /*Loop While no device is connected ...*/
            while (!closing)
            {
                InposExtError error = InposExt.Initialize(1, serialNo.ToUpper(), ListenIP.Text.Replace(" ", ""), (UInt16)ListenPort.Value, 700);
                if (error != InposExtError.InposNoError)
                {
                    if (error != InposExtError.InposConnectionError)
                    {
                        closing = true;
                        Info.Text += "Hata: " + ((Int32)error).ToString() + " " + "(" + error.ToString() + ")" + "\n"
                                  + ErrorDetailString();
                        return;
                    }
                }
                else
                {
                    break;
                }

                Application.DoEvents();
            }

            if (!closing)
            {
                UInt64 limit = 0;
                Int32 zdt = 0, edt = 0;

                InposExtError error = InposExt.SaleLimit(timeout, ref limit);
                if (error == InposExtError.InposNoError)
                {
                    error = InposExt.LastZDateTime(timeout, ref zdt);
                    if (error == InposExtError.InposNoError)
                    {
                        error = InposExt.EcrDateTime(timeout, ref edt);
                    }
                }

                if (error != InposExtError.InposNoError)
                {
                    InposExtErrorDetail detail = InposExt.ErrorDetail();
                    Info.Text = "Bağlı." + " Detay: " + detail.ToString();
                }
                else
                {
                    String sn = "";
                    InposExt.ActiveDevice(out sn);

                    Info.Text = "Bağlı."
                                + " Satış limiti: " + String.Format("{0:0.00}", limit / 100.0).ToString() + " TL"
                                + " Son Z: " + InposExt.FromUnixTime(zdt).ToString("dd.MM.yyyy HH:mm:ss")
                                + " Yazarkasa saati: " + InposExt.FromUnixTime(edt).ToString("dd.MM.yyyy HH:mm:ss")
                                +" Etkin Cihaz: " + sn;
                }

                //Callback Register
                InposExt.SetEcrStateCallback(StateCallback);
            }

            closing = true;
        }

        private void EcrState_Click(object sender, EventArgs e)
        {
            InposEcrState state;
            InposEcrSaleState sState;
            InposExtError error = InposExt.EcrSaleState(timeout, out state, out sState);

            if (error == InposExtError.InposNoError)
                Info.Text = "Yazarkasa durumu: " + ((Int32)state).ToString() + " " + "(" + state.ToString() + ")" + sState.ToString();
            else
                Info.Text = "Yazarkasa durumu sorgulanamadı. " 
                          + "Hata: " + ((Int32)error).ToString() + " " + "(" + error.ToString() + ")" + "\n"
                          + ErrorDetailString();
        }

        private void CloseInit_Click(object sender, EventArgs e)
        {
            bool closeActiveDevice = closing; //closing == false while trying to connect to a device.

            closing = true;

            if (closeActiveDevice)
                InposExt.Close();

            State.Text = "";
            Info.Text = "Bağlı değil.";
        }

        private void StartSale_Click(object sender, EventArgs e)
        {
            receipt.receiptNo = 0;
            receipt.zNo = 0;

            InposExtError error = InposExt.StartSale(timeout);

            if (error == InposExtError.InposNoError)
                Info.Text = "Satış başladı.";
            else
                Info.Text = "Satış başlatılamadı. " 
                          + "Hata: " + ((Int32)error).ToString() + " " + "(" + error.ToString() + ")" + "\n"
                          + ErrorDetailString();
        }

        private void SaleState_Click(object sender, EventArgs e)
        {
            InposEcrSaleState saleState;
            InposEcrSaleTotals totals = new InposEcrSaleTotals();

            InposExtError error = InposExt.SaleState(timeout, out saleState, ref totals, ref receipt);

            if (error == InposExtError.InposNoError)
            {
                Info.Text = "Satış durumu: " + ((Int32)saleState).ToString() + " " + "(" + saleState.ToString() + ")";
                Info.Text += Environment.NewLine + "Toplam: " + totals.totalAmount.ToString() + " KDV: " + totals.totalVat.ToString() + " Kalem: " + totals.itemCount;
                Info.Text += Environment.NewLine + "Tahsilat Tutarı: " + totals.amountToPay.ToString() + " Nakit: " + totals.cashPaymentAmount.ToString() + " Kredi K: " + totals.creditCardPaymentAmount.ToString();
                Info.Text += Environment.NewLine + "Fiş No: " + receipt.receiptNo.ToString() + " Z No: " + receipt.zNo.ToString();

                ReceiptNo.Value = receipt.receiptNo;
                ZNo.Value = receipt.zNo;
            }
            else
            {
                Info.Text = "Satış durumu sorgulanamadı. " 
                          + "Hata: " + ((Int32)error).ToString() + " " + "(" + error.ToString() + ")" + "\n"
                          + ErrorDetailString();
            }
        }

        private void CancelSale_Click(object sender, EventArgs e)
        {
            saleItems.count = 0;

            InposExtError error = InposExt.CancelSale(timeout);

            if (error == InposExtError.InposNoError)
                Info.Text = "Satış iptal edildi.";
            else
                Info.Text = "Satış iptal edilemedi. " 
                          + "Hata: " + ((Int32)error).ToString() + " " + "(" + error.ToString() + ")" + "\n"
                          + ErrorDetailString();
        }

        private void AddSaleItem_Click(object sender, EventArgs e)
        {
            UInt32 index = 0;
            InposEcrState ecrState = 0;
            bool isConnected = false;
            int errorCount = 0;
            InposEcrSaleState saleState = InposEcrSaleState.InposSaleWaitingForInput;
            InposSaleType type = InposSaleType.SaleWithReceiptType;

            InposExt.SaleType(timeout, ref type);

            bool isItemAdded = false;
            InposExtError error = InposExtError.InposNoError;

            error = internalCheckSaleStatus(error, ref saleState, ref errorCount);

            error = internalCheckEcrStatus(error, ref ecrState, ref errorCount);
            if(error == InposExtError.InposConnectionError)
            {
                reconnect(isConnected, ref error, ref errorCount);
            }
            errorCount = 0;
            if (ecrState == InposEcrState.InposEcrLogin)
            {
                error = InposExt.Login(timeout);
                Thread.Sleep(100);
                if (error == InposExtError.InposConnectionError)
                    reconnect(isConnected, ref error, ref errorCount);
                else
                {
                    error = internalCheckEcrStatus(error, ref ecrState, ref errorCount);
                    if (ecrState == InposEcrState.InposEcrZReportRequired)
                    {
                        error = InposExt.ZReport();
                    }
                    error = internalCheckEcrStatus(error, ref ecrState, ref errorCount);
                    if (ecrState == InposEcrState.InposEcrMainMenu)
                    {
                        error = InposExt.StartSale(timeout);
                        if (error == InposExtError.InposConnectionError)
                            reconnect(isConnected, ref error, ref errorCount);
                    }
                    error = internalCheckEcrStatus(error, ref ecrState, ref errorCount);
                }
                errorCount = 0;
            }
            error = internalCheckEcrStatus(error, ref ecrState, ref errorCount);
            if (ecrState == InposEcrState.InposEcrMainMenu)
            {
                error = InposExt.StartSale(timeout);
                if (error == InposExtError.InposConnectionError)
                    reconnect(isConnected, ref error, ref errorCount);
            }

            InposEcrSaleTotals totals = new InposEcrSaleTotals();
            error = internalCheckSaleStatus(error, ref saleState, ref errorCount);


            int addedItemCount = 0;

            if (saleItems.count == 0)
            {
                UInt64 limit = 0;
                InposEcrSaleItem item;

                item.name = ItemName.Text;

                item.unitPrice = (UInt64)UnitPrice.Value;
                item.multiplier = (UInt32)Multiplier.Value;
                item.discountRate = (Int32)DiscountRate.Value;
                item.discountAmount = (UInt64)DiscountAmount.Value;
                item.section = (byte)Section.Value;
                item.unit = (Inpos.Unit)UnitComboBox.SelectedIndex;

                if (type == InposSaleType.SaleWithInvoiceType)
                {
                    InposExt.AddSaleItem(timeout, ref item, ref totals);
                    isItemAdded = true;
                }
                else
                {
                    InposExt.SaleLimit(timeout, ref limit);
                    if ((item.unitPrice * item.multiplier / 1000) + (UInt64)totals.totalAmount <= limit)
                    {
                        error = InposExt.AddSaleItem(timeout, ref item, ref totals);
                        isItemAdded = true;
                        index++;
                    }
                    else
                    {
                        if (error != InposExtError.InposNotInitializedError)
                        {
                            isItemAdded = false;
                            Info.Text += Environment.NewLine;
                            Info.Text += "Satış limitini aştınız ürünler eklenemedi. Lütfen Bu ürünler için fatura düzenleyin. ";
                            Info.Text += Environment.NewLine;
                        }
                    }
                }
                if (error == InposExtError.InposNoError)
                    addedItemCount = 1;
            }
            else
            {
                error = InposExt.AddMultipleSaleItems(timeout, ref saleItems, ref totals);

                if (error == InposExtError.InposNoError)
                {
                    addedItemCount = saleItems.count;
                    isItemAdded = true;
                    index = index + saleItems.count;
                }
            }

            saleItems.count = 0;

            if (error == InposExtError.InposNoError && isItemAdded)
            {
                Info.Text = "Satış kalem(ler)i eklendi.";
                Info.Text += Environment.NewLine;
                Info.Text += "Toplam: " + totals.totalAmount.ToString() + " KDV: " + totals.totalVat.ToString() + " Tahsilat Tutarı: " + totals.amountToPay.ToString() + " Kalem: " + totals.itemCount;
                Info.Text += Environment.NewLine;
                Info.Text += addedItemCount.ToString() + " kalem eklendi.";
            }
            else
            {
                Info.Text += "Satış kalem(ler)i eklenemedi. " 
                          + "Hata: " + ((Int32)error).ToString() + " " + "(" + error.ToString() + ")" + "\n"
                          + ErrorDetailString();
            }
        }

        private void EndSale_Click(object sender, EventArgs e)
        {
            InposSaleType type = InposSaleType.SaleWithReceiptType;

            InposExt.SaleType(timeout, ref type);

            InposExtError error = InposExt.EndSale((PaymentType)PaymentTypeComboBox.SelectedIndex);

            if (error == InposExtError.InposNoError)
                Info.Text = "Satış sonlandırma komutu gönderildi.";
            else
                Info.Text = "Satış sonlandırma komutu gönderilemedi. " 
                          + "Hata: " + ((Int32)error).ToString() + " " + "(" + error.ToString() + ")" + "\n"
                          + ErrorDetailString();

        }

        private void DeleteLastItem_Click(object sender, EventArgs e)
        {
            InposEcrSaleTotals totals = new InposEcrSaleTotals();

            InposExtError error = InposExt.DeleteLastSaleItem(timeout, ref totals);

            if (error == InposExtError.InposNoError)
            {
                Info.Text = "Satış kalemi silindi.";
                Info.Text += Environment.NewLine + "Toplam: " + totals.totalAmount.ToString() + " KDV: " + totals.totalVat.ToString() +
                             " Tahsilat Tutarı: " + totals.amountToPay.ToString() + " Kalem: " + totals.itemCount;
            }
            else
            {
                Info.Text = "Hata: " + ((Int32)error).ToString() + " " + "(" + error.ToString() + ")" + "\n"
                          + ErrorDetailString();
            }
        }

        private void DumpReceipt(InposEcrSaleTotalsExt totals)
        {
            Info.Text = "Kalem: " + totals.itemCount.ToString() + " Toplam: " + totals.totalAmount.ToString() + " KDV: " + totals.totalVat.ToString() + " Tahs.Tutarı: " + totals.amountToPay.ToString();
            Info.Text += Environment.NewLine + "Nakit: " + totals.cashPaymentAmount.ToString();
            Info.Text += Environment.NewLine + "Banka[" + totals.creditCardPayment.totalCount.ToString() + "]: " + totals.creditCardPayment.totalAmount;
            if (totals.creditCardPayment.totalCount > 0)
            {
                Info.Text += " -> ";

                for (UInt32 i = 0; i < totals.creditCardPayment.totalCount; i++)
                    Info.Text += "{" + totals.creditCardPayment.acquires[i].id.ToString() + " - " + totals.creditCardPayment.acquires[i].amount.ToString() + "} ";
            }

            Info.Text += Environment.NewLine + "Yemek[" + totals.mealCardPayment.totalCount.ToString() + "]: " + totals.mealCardPayment.totalAmount;
            if (totals.mealCardPayment.totalCount > 0)
            {
                Info.Text += " -> ";

                for (UInt32 i = 0; i < totals.mealCardPayment.totalCount; i++)
                    if (i < InposEcrPayment.MAX_ACQUIRER_COUNT)
                        Info.Text += "{" + totals.mealCardPayment.acquires[i].id.ToString() + " - " + totals.mealCardPayment.acquires[i].amount.ToString() + "} ";
                    else
                        Info.Text += " [Acquier out of range]";
            }

            Info.Text += Environment.NewLine;

            for (UInt32 i = 0; i < InposEcrPaymentOther.Count(totals.others); i++)
            {
                String name;

                if (PaymentTypeNames.TryGetValue(totals.others[i].type, out name))
                {
                    Info.Text +=  name + ": "+ totals.others[i].totalCount.ToString() + " - " + totals.others[i].totalAmount.ToString();
                    Info.Text += " ";
                }
            }
            Info.Text += Environment.NewLine;
        }

        private void DumpReceipt(InposEcrSaleTotals totals)
        {
            Info.Text = "Toplam: " + totals.totalAmount.ToString() + " KDV: " + totals.totalVat.ToString() + " Tahsilat Tutarı: " + totals.amountToPay.ToString();
            Info.Text += Environment.NewLine + "Nakit: " + totals.cashPaymentAmount.ToString() + " Kredi K: " + totals.creditCardPaymentAmount + " Kalem: " + totals.itemCount.ToString();
        }

        private void ReceiptData_Click(object sender, EventArgs e)
        {
            InposSaleReceipt r = new InposSaleReceipt((UInt32)ReceiptNo.Value, (UInt32)ZNo.Value);

            InposExtError error = InposExtError.InposNoError;

            if (isExtCheckBox.Checked)
            {
                InposEcrSaleTotalsExt totals = new InposEcrSaleTotalsExt();

                error = InposExt.ReceiptData(timeout, ref r, ref totals);

                if (error == InposExtError.InposNoError)
                {
                    DumpReceipt(totals);
                }
            }
            else
            {
                InposEcrSaleTotals totals = new InposEcrSaleTotals();

                error = InposExt.ReceiptData(timeout, ref r, ref totals);

                if (error == InposExtError.InposNoError)
                {
                    DumpReceipt(totals);
                }
            }

            if(error != InposExtError.InposNoError)
            {
                Info.Text = "Hata: " + ((Int32)error).ToString() + " " + "(" + error.ToString() + ")" + "\n"
                          + ErrorDetailString();
            }
        }

        private void CheckPaper_Click(object sender, EventArgs e)
        {
            InposExtError error = InposExt.CheckPrinterPaper(timeout);

            if (error == InposExtError.InposNoError)
                Info.Text = "Yazıcıda kağıt var.";
            else
                Info.Text = "Yazıcı kağıdı kontrolü başarısız. " 
                          + "Hata: " + ((Int32)error).ToString() + " " + "(" + error.ToString() + ")" + "\n"
                          + ErrorDetailString();
        }

        private Boolean reconnect(bool isConnected,ref InposExtError error, ref int errorCount)//metod tekrar bağlanma metodudur.
        {
            String serialNo = EcrSerialNoComboBox.Text;
            closing = false;

            while (!closing || errorCount < 10)                         //bağlantı gelene kadar 10 kere deneme yapar. Eğer internalecr ve internalsale metodlarından buraya zıplama varsa
                                                                        //errorCount oralarda 10 kere ve burada da 10 kere döneceği için 10*10 defa deneme yapılmış olur aslında.
            {
                error = InposExt.Initialize(1, serialNo.ToUpper(), ListenIP.Text.Replace(" ", ""), (UInt16)ListenPort.Value, 700);  //dll'deki bağlanma metodu
                if (error != InposExtError.InposNoError)
                {
                    isConnected = false;
                    if (error == InposExtError.InposConnectionError)        //hata devam ediyorsa tekrar deneme için errorcount +1
                    {
                        errorCount++;
                        closing = true;
                       // Info.Text = "Hata: " + ((Int32)error).ToString() + " " + "(" + error.ToString() + ")" + "\n"
                               //   + ErrorDetailString() + "\n" + "Hata Sayısı: " + errorCount.ToString() + " ";
                    }
                }
                else
                {
                    isConnected = true;             //bağlandıysa break et
                    break;
                }
            }
            return isConnected;                     //bağlanırsa true bağlanamazsa false dönecek
        }
        private InposExtError internalCheckEcrStatus(InposExtError errorEcr, ref InposEcrState ecrState, ref int errorCount)
        {
            bool isConnected = false;       //bağlantı koparsa aşağıda çalışacak metodlar bağlantı tekrar sağlandığında true'ya çeker

            errorEcr = InposExt.EcrState(timeout, out ecrState);    //yazarkasa durumunu sorar
            if(errorEcr == InposExtError.InposNoError)              //hata yoksa devam eder
            {
                isConnected = true;                                 //bağlantı olduğu için true set edildi
                return errorEcr;                                    //bir sorun yok bu yüzden errorEcr = noError dönecek
            }
            else
            {
                while (errorEcr == InposExtError.InposConnectionError && errorCount < 10)   //hata varsa ve hata bağlantı hatasıysa reconnect metodunu çalıştır
                {                                                                           //errorCount maksimum 10 kere dönmesini sağlamak için var
                    isConnected = reconnect(isConnected, ref errorEcr, ref errorCount);     //metod tekrar tekrar bağlanmayı dener
                    return errorEcr;                                                        //errorEcr hata yoksa noError varsa da error ne ise onu dönecek
                }
            }
            if(ecrState == InposEcrState.InposEcrInitialization)                            //cihaz durumu cihazın bağlanması gerektiğini işaret ederse bağlanması için
            {
                isConnected = reconnect(isConnected, ref errorEcr, ref errorCount);         //reconnect tekrar bağlanma işini yapacak
                if (isConnected)                                                            //true ise yazarkasa durumunu soracak
                {
                    errorEcr = InposExt.EcrState(timeout, out ecrState);
                    return errorEcr;
                }
            }
            return errorEcr;                                                                //genel return hata varsa hatayı yoksa noError döner.
        }
        private InposExtError internalCheckSaleStatus(InposExtError errorSale, ref InposEcrSaleState saleState, ref int errorCount) //satış durumu sorgusu
        {
            bool isConnected = false;     //bağlantı koparsa aşağıda çalışacak metodlar bağlantı tekrar sağlandığında true'ya çeker
            InposEcrSaleTotals totalsDummy = new InposEcrSaleTotals();  //satış durumu sorgusu için gerekli olan parametrelerden birisi bu struct objesidir. O yüzden dummy(geçici) oluşturuldu.

            errorSale = InposExt.SaleState(timeout, out saleState, ref totalsDummy, ref receipt);   //satış durumunu sorar
            if(errorSale == InposExtError.InposNoError)                                             //hata yoksa devam eder
            {
                isConnected = true;                                 //hata olmadığı için bağlantı var
                ReceiptNo.Value = receipt.receiptNo;                //fiş no değeri cihazdan alındı
                ZNo.Value = receipt.zNo;                            //z no değeri cihazdan alındı
                return errorSale;                                   //hata olmadığı için noError dönecek.
            }
            else//hata varsa
            {
                while (errorSale == InposExtError.InposConnectionError && errorCount < 10)  //bağlantı hatası varsa tekrar bağlanmaya çalış
                {
                    isConnected = reconnect(isConnected, ref errorSale, ref errorCount);
                    return errorSale;                                                       //bağlanırsa noError bağlanamazsa hata kodunu döner
                }
            }
            return errorSale;                                                               //genel return hata varsa hatayı yoksa noError döner.
        }
        private void AddPayment_Click(object sender, EventArgs e)  //ödeme ekle butonu. Satışın ödemelerini bu metodla yapın.
        {
            Info.Text = " ";    //Demo için text alanını sıfırla.
            int errorCount = 0; //Kullanılan metodların tekrar deneme sayacı
            bool isSaleEnd;     //Satış bittiğinde bu değişkene atama yapıp satışın bitişini sorabilirsiniz
            bool isPaymentOk;   //Ödeme alındığında bu değişkene atama yapıp ödeme alındığını sorabilirsiniz
            bool isConnected = true;    //bağlantı kopmasından sonra tekrar bağlanmayı döndüren değişken

            InposExtError error = 0;            //InposExtError enum tipinde error değişkeni başlangıçta 0 hata olmadığı anlamındadır.
            InposEcrSaleState saleState = 0;    //InposExtError enumu ile aynı mantık
            InposEcrState ecrState = 0;         //InposExtError enumu ile aynı mantık

            InposEcrSaleTotalsExt first = new InposEcrSaleTotalsExt();  //Ödeme ekle butonuna basıldığında ödemeyi alan addPayment() metodundan
                                                                        //Önce ödeme bulunmayan fişteki datalar (ilk atama için 0 değerleri bulunur)
             //InposEcrSaleTotalsExt first değişkeni fişteki total      //Eğer parçalı ödeme bir kere yapıldıysa, ikinci ödeme alındığında 
             //ödemelerin datalarını tutan bir struct objesidir         //artık 1. durumun değerlerini döner(2. atama için ne kadar ödeme alındıysa)

            error = internalCheckEcrStatus(error, ref ecrState, ref errorCount);    //yazarkasa durumu sorgusu yapar
            if(error == InposExtError.InposConnectionError)                         //satış durumu sorgusunda bir hata varsa texte döker
            {
                Info.Text += "Yazarkasa durumu sorgulanırken hata oluştu: " + error.ToString() + "Tekrar deneme sayısı: " + errorCount.ToString()
                    + "Bağlantıları kontrol ediniz";
                errorCount = 0;
            }

            error = internalCheckSaleStatus(error, ref saleState, ref errorCount);  //satış durumu sorgusu yapar
            if (error == InposExtError.InposConnectionError)                        //eğer bir hata varsa texte döker
            {
                Info.Text += "Satış durumu sorgulanırken hata oluştu: " + error.ToString() + "Tekrar deneme sayısı: " + errorCount.ToString()
                    + "Bağlantıları kontrol ediniz";
                errorCount = 0;
            }
            InposSaleReceipt r = new InposSaleReceipt((UInt32)ReceiptNo.Value, (UInt32)ZNo.Value);  //InposSaleReceipt structından r adında nesne oluşturulur.
                                                                                                    //İhtiyacı olan 2 adet parametre(fisno zno) satış sorgusuyla
                                                                                                    //beraber daha önce cihazdan alınmıştır.
            error = InposExt.ReceiptData(timeout, ref r, ref first);    //satışın ilk durumu için satış verileri sorgulanır
            if(error == InposExtError.InposConnectionError)             //Eğer bir bağlantı hatası varsa
            {
                reconnect(isConnected, ref error, ref errorCount);      //Tekrar bağlanma metoduna gidilip bağlantı alınmaya çalışılır.
                if (!isConnected)                                       //Hala daha bağlantı gelmediyse hata texte dökülür
                {                                                       //Bu işlem sayaç ile sayılır
                    Info.Text += "Fiş bilgisi sorgulanırken hata oluştu: " + error.ToString()+ "  " + "Tekrar deneme sayısı: " + errorCount.ToString()
                        + "  " + "Bağlantıları kontrol ediniz";
                    errorCount = 0;                                     //texte döküm yapıldıktan sonra sayaç daha sonra kullanılmak için sıfırlanır
                }
                else
                    error = InposExt.ReceiptData(timeout, ref r, ref first);    //hata yoksa tekrar veriler sorgulanır
            }
            if (PaymentAcquirerComboBox.SelectedIndex >= 0)     //harici yemek kartı kontrolü eğer varsa if içine girer
            {
                Acquirer acquirer = (Acquirer)Enum.Parse(typeof(Acquirer), PaymentAcquirerComboBox.SelectedItem.ToString());
                
                error = InposExt.AddPayment((PaymentType)PaymentTypeComboBox.SelectedIndex, (UInt64)PaymentAmount.Value, acquirer); //ödemenin cihazda tahsil edildiği asıl yer burası
                
                if (error == InposExtError.InposConnectionError)
                {
                    reconnect(isConnected, ref error, ref errorCount);      //hata varsa yine tekrar bağlanma denenir
                    if (!isConnected)
                    {
                        Info.Text += "Ödeme eklenirken hata oluştu: " + error.ToString() + "Tekrar deneme sayısı: " + errorCount.ToString()
                            + "Bağlantıları kontrol ediniz";
                        errorCount = 0;                                     //sayaç sıfırlanır
                    }
                    else
                        error = InposExt.AddPayment((PaymentType)PaymentTypeComboBox.SelectedIndex, (UInt64)PaymentAmount.Value, acquirer);
                }
            }
            else
            {
                error = InposExt.AddPayment((PaymentType)PaymentTypeComboBox.SelectedIndex, (UInt64)PaymentAmount.Value);   //eğer harici yemek kartı seçilmediyse düz ekleme yapar
                if (error == InposExtError.InposConnectionError)    //hata kontrolü
                {
                    reconnect(isConnected, ref error, ref errorCount);
                    if (!isConnected)
                    {
                        Info.Text += "Ödeme eklenirken hata oluştu: " + error.ToString() + "Tekrar deneme sayısı: " + errorCount.ToString()
                            + "Bağlantıları kontrol ediniz";
                        errorCount = 0;
                    }
                    else
                        error = InposExt.AddPayment((PaymentType)PaymentTypeComboBox.SelectedIndex, (UInt64)PaymentAmount.Value);
                }
            }

            error = internalCheckEcrStatus(error, ref ecrState, ref errorCount);    //yazarkasa durum kontrolü
            if (error == InposExtError.InposConnectionError)
            {
                Info.Text += "Ödeme sonrası yazarkasa durumu sorgulanırken hata oluştu: " + error.ToString() + "Tekrar deneme sayısı: " + errorCount.ToString()
                    + "Bağlantıları kontrol ediniz";
                errorCount = 0;
            }

            while (ecrState == InposEcrState.InposEcrNotUsable)     //eğer yazıcıda kağıt biterse cihaz konumu notusable döner
            {
                error = internalCheckEcrStatus(error, ref ecrState, ref errorCount);
                Info.Text += "Yazıcı hatası. Yazıcıda kağıt olmayabilir.";
                Thread.Sleep(500);
                Info.Text += " ";
            }               //metod kağıt koyulana kadar çalışır. kağıt eklendikten sonra döngüden çıkar
            if (error == InposExtError.InposNoError)        // yazarkasa durumu sonucu hatasız ise
            {
                errorCount = 0;
                Info.Text += "Ödeme bilgisi gönderildi.";   //addPayment ile eklenen tutar alınmıştır.

                InposEcrSaleTotalsExt second = new InposEcrSaleTotalsExt();     //ödeme alındıktan sonraki yeni totals objesi oluşturulur. first ile karşılaştırma olacak
                error = internalCheckSaleStatus(error, ref saleState, ref errorCount);      //satış durumu sorgusu
                errorCount = 0;
                while (saleState == InposEcrSaleState.InposSaleWaitingForTransactionCompleted)  //eğer satış kredi kartıysa ödemenin alınmasını bekler
                {
                    Info.Text = " ";
                    Application.DoEvents();
                    Thread.Sleep(1000);

                    error = internalCheckSaleStatus(error, ref saleState, ref errorCount);  //ödeme alınırsa artık kredi kartı işlemi ekranı gideceği için döngüden çıkartacak sorgu
                    if(error == InposExtError.InposConnectionError)                         //hata yoksa devam et varsa tekrar sorgula ve bağlan
                    {
                        reconnect(isConnected, ref error, ref errorCount);
                        errorCount = 0;
                    }
                }

                error = InposExt.ReceiptData(timeout, ref r, ref second);               //second için fiş dataları sorgusu
                if(error == InposExtError.InposConnectionError)                         //hata kontrolü
                {
                    isConnected = false;
                    reconnect(isConnected, ref error, ref errorCount);
                    if (isConnected)
                    {
                        //tam anlayamadığımız bir sebepten dolayı bazen cihaz argüman hatasına düşüyor. Hataya düşmesine rağmen
                        //satışın tamamlandığını gördük sahada bu yüzden bir koşul ekleyerek buradaki sorunu görmezden gelmeye çalışan kod parçası
                        error = InposExt.ReceiptData(timeout, ref r, ref second);       //second için fiş dataları sorgusu
                        errorCount = 0;
                        while(error == InposExtError.InposInvalidArgumentError && errorCount < 10)      //hatanın argüman hatası olduğu durum döngüsü
                        {
                            //10 kere daha fiş bilgisini almaya çalışıyoruz. Hala argüman hatası dönüyorsa bypass edeceğiz.
                            //Burada dikkat edilmesi gereken şey; Eğer argüman hatası alıyorsanız ReceiptData metodunda geçilen parametre
                            //değerlerini kontrol etmeniz. Gerekiyorsa debug bakın log tutun bu değerler doğru gitmeli.
                            error = InposExt.ReceiptData(timeout, ref r, ref second);               //second için fiş dataları
                        }
                        if(error == InposExtError.InposInvalidArgumentError)        //tüm denemelere rağmen hala argüman hatası varsa satışı aldığını varsay
                        {
                            Info.Text += "Satış tamamlandı ya da ödeme alındı.";
                            error = InposExtError.InposNoError;                     //hatayı hata olmadığı değere atayarak bypass ettik.
                        }
                    }
                    else
                    {
                        Info.Text += "Fiş verisi sorgulanırken bağlantı hatası oluştu. Lütfen bağlantıları kontrol edin." + " "
                        + "Hata Sayısı: " + errorCount.ToString();
                        errorCount = 0;
                    }
                }
                if (error == InposExtError.InposNoError)        //hataların es geçildiği durumlarda veya hatasız gelindiğinde
                {
                    if (first == second)                        //satışın ilk durumu yani 0 ve ikinci durumu yani 1 durumunu karşılaştır.
                                                                //eğer parçalı ödeme çok adımlı ise 1. durum ve 2. durumu karşılaştırır şeklinde iterasyon ilerler.
                                                                //eğer ilk durum ve ikinci durum eşitse ödeme alınmamıştır. aksi takdirde ödeme alınmıştır.
                    {
                        DumpReceipt(second);
                        Info.Text = "Ödeme alınamadı. ";
                        isPaymentOk = false;
                    }
                    else
                    {
                        error = internalCheckEcrStatus(error, ref ecrState, ref errorCount);    //ödemenin alındığı durum için yazarkasa durumu
                        if (ecrState == InposEcrState.InposEcrSaleWithInvoice)                  //eğer faturalı satış yapılıyorsa dataları doldurun ve otomatik fatura kesilsin.
                        {
                            InposInvoiceData data;
                            data.invoiceType = (Inpos.InvoiceType)InvoiceTypeComboBox.SelectedIndex;
                            data.noType = (Inpos.CustomerNoType)CustomerNoTypeComboBox.SelectedIndex;
                            data.slipCount = (UInt32)SlipCountComboBox.SelectedIndex + 1;
                            data.printDeliveryNote = (UInt32)(PrintDeliveryNoteCheckBox.Checked ? 1 : 0);

                            data.invoiceNo = InvoiceNoText.Text;
                            data.customerNo = CustomerNoText.Text;

                            error = InposExt.EndSaleWithInvoice(ref data);                  //faturalı satışı sonlandıran metod. artık addpayment_click içinde gömülü

                            if (error == InposExtError.InposNoError)                        //hata yoksa
                            {
                                while(ecrState != InposEcrState.InposEcrMainMenu)           //cihaz anamenüye gelene kadar bekle bu bekleme slibin basılma süresine eşittir.
                                {
                                    error = internalCheckEcrStatus(error, ref ecrState, ref errorCount);    //yazarkasa durumu sor hatayı kontrol et
                                    if(error != InposExtError.InposNoError)   
                                        Info.Text = "Faturalı satış sonlanırken hata oluştu: " + error.ToString();
                                }
                                Info.Text = "Faturalı satış tamamlandı.";               
                                isSaleEnd = true;
                            }   
                            else
                                Info.Text = "Faturalı satış sonlandırma komutu gönderilemedi. "
                                          + "Hata: " + ((Int32)error).ToString() + " " + "(" + error.ToString() + ")" + "\n"
                                          + ErrorDetailString();
                        }
                        else                                                                  //faturalı satış değilse
                        {
                            error = internalCheckEcrStatus(error, ref ecrState, ref errorCount);        //yazarkasa ve satış durumunu sorgula
                            error = internalCheckSaleStatus(error, ref saleState, ref errorCount);

                            if (ecrState == InposEcrState.InposEcrMainMenu || saleState == InposEcrSaleState.InposSaleDataFinalized || saleState == InposEcrSaleState.InposSaleIdle)
                            {
                                //bu koşul yazarkasa durumunun anamenüye geldiği veya satışın datafinalized yani bittiği yada mainmenu ve saleidle durumları birbirine denk durumlar
                                //olduğu için satış durumunun saleidle olarak döndüğünü kontrol eder. Eğer durumlar bunlardan biriyse satış bitmiştir. 
                                DumpReceipt(second);
                                Info.Text += "Satış tamamlandı. ";
                                isSaleEnd = true;
                            }
                            else
                            {
                                //yukarıdaki koşul sağlanmadığı durumda ise parçalı ödeme senaryosu mevcuttur. bu yüzden satışın daha bitmediğini ama gönderilen ödemenin alındığını gösterir.
                                DumpReceipt(second);
                                Info.Text += "Ödeme alındı. ";
                                isPaymentOk = true;
                            }
                        }  
                    }
                }       
            }
            else
            {
                Info.Text = "Ödeme bilgisi gönderme başarısız. "
                          + "Hata: " + ((Int32)error).ToString() + " " + "(" + error.ToString() + ")" + "\n"
                          + ErrorDetailString();
            }
        }
        private void MedicalContribution_Click(object sender, EventArgs e)
        {
            UInt64 amount = (UInt64)PaymentAmount.Value;
            UInt64 id = 0;

            if (amount > 0)
            {
                try
                {
                    id = UInt64.Parse(ItemName.Text);
                }
                catch
                {
                    id = 0;
                }                

                if (id == 0)
                {
                    Info.Text = "Müşteri TCKN geçerli değil. TCKN'yi kalem adı alanına girin.";
                    return;
                }
            }

            InposExtError error = InposExt.AddMedicalContribution(timeout, amount, id);

            if (error == InposExtError.InposNoError)
                Info.Text = "Katkı payı bilgisi gönderildi.";
            else
                Info.Text = "Katkı payı gönderme başarısız. " 
                          + "Hata: " + ((Int32)error).ToString() + " " + "(" + error.ToString() + ")" + "\n"
                          + ErrorDetailString();
        }

        private void SectionData_Click(object sender, EventArgs e)
        {
            InposEcrSaleItem item = new InposEcrSaleItem();
            item.section = (byte)Section.Value;

            InposExtError error = InposExt.SectionData(timeout, ref item);

            if (error == InposExtError.InposNoError)
                Info.Text = "Kısım adı: " + item.name.ToString() + " KDV oranı: " + item.multiplier.ToString();
            else
                Info.Text = "Kısım bilgisi alınamadı. " 
                          + "Hata: " + ((Int32)error).ToString() + " " + "(" + error.ToString() + ")" + "\n"
                          + ErrorDetailString();
        }

        void XReport_CLick(object sender, EventArgs e)
        {
            InposExtError error = InposExt.XReport();

            if (error == InposExtError.InposNoError)
                Info.Text = "X raporu komutu gönderildi.";
            else
                Info.Text = "X raporu komutu gönderme başarısız. " 
                          + "Hata: " + ((Int32)error).ToString() + " " + "(" + error.ToString() + ")" + "\n"
                          + ErrorDetailString();
        }

        void ZReport_CLick(object sender, EventArgs e)
        {
            InposExtError error = InposExt.ZReport();

            if (error == InposExtError.InposNoError)
                Info.Text = "Z raporu komutu gönderildi.";
            else
                Info.Text = "Z raporu komutu gönderme başarısız. " 
                          + "Hata: " + ((Int32)error).ToString() + " " + "(" + error.ToString() + ")" + "\n"
                          + ErrorDetailString();
        }

        private void CurrentZ_Click(object sender, EventArgs e)
        {
            UInt32 zNo = 0;
            InposExtError error = InposExt.CurrentZ(timeout, out zNo);

            if (error == InposExtError.InposNoError)
                Info.Text = "Z No: " + zNo.ToString();
            else
                Info.Text = "Hata:" + ((Int32)error).ToString() + " " + "(" + error.ToString() + ")" + "\n"
                          + ErrorDetailString();
        }

        private void SetCodec_Click(object sender, EventArgs e)
        {
            if (String.IsNullOrEmpty(CodecLine.Text))
            {
                Info.Text = "Codec alanı boş.";
                return;
            }

            InposExtError error = InposExt.PrinterSetEncoding(CodecLine.Text);

            if (error == InposExtError.InposNoError)
                Info.Text = "Codec geçerli. Yeni yazıcı belgesi başlatıldı.";
            else
                Info.Text = "Codec geçerli değil. " 
                          + "Hata: " + ((Int32)error).ToString() + " " + "(" + error.ToString() + ")" + "\n"
                          + ErrorDetailString();
        }

        private void AddText_Click(object sender, EventArgs e)
        {
            byte[] text;

            if (String.IsNullOrEmpty(Slip.Text))
            {
                Info.Text = "Metin alanı boş.";
                return;
            }

            try
            {
                text = Encoding.GetEncoding(CodecLine.Text).GetBytes(Slip.Text);
            }
            catch
            {
                Info.Text = "Codec geçerli değil.";
                return;
            }            

            TextFormat tf;

            tf.bold = boldTextRadioButton.Checked ? true : false;
            tf.small = smallTextRadioButton.Checked ? true : false;
            tf.alignment = alignLeftRadioButton.Checked ? Alignment.AlignLeft
                                                        : alignRightRadioButton.Checked ? Alignment.AlignRight
                                                                                        : Alignment.Centered;
            InposExtError error = InposExt.PrinterAddText(text, ref tf);

            if (error == InposExtError.InposNoError)
                Info.Text = "Metin eklendi.";
            else
                Info.Text = "Metin eklenemedi. "
                          + "Hata: " + ((Int32)error).ToString() + " " + "(" + error.ToString() + ")" + "\n"
                          + ErrorDetailString();
        }

        void PrintSlip_Click(object sender, EventArgs e)
        {
            InposExtError error = InposExt.PrinterSlip(timeout * 2, printAfterSaleCheckBox.Checked);

            if (error == InposExtError.InposNoError)
                Info.Text = "Belge yazdırıldı.";
            else
                Info.Text = "Belge yazdırılamadı. Hata. " 
                          + "Hata: " + ((Int32)error).ToString() + " " + "(" + error.ToString() + ")" + "\n"
                          + ErrorDetailString();
        }

        private void Login_Click(object sender, EventArgs e)
        {
            InposEcrState ecrState = 0;
            int errorCount = 0;
            InposExtError error = InposExt.Login(timeout);

            error = internalCheckEcrStatus(error, ref ecrState, ref errorCount);

            if (ecrState == InposEcrState.InposEcrZReportRequired)
                error = InposExt.ZReport();

            if (error == InposExtError.InposNoError)
                Info.Text = "Kasiyer hesabına girildi.";
            else
                Info.Text = "Kasiyer hesabına girilemedi. " 
                          + "Hata: " + ((Int32)error).ToString() + " " + "(" + error.ToString() + ")" + "\n"
                          + ErrorDetailString();
        }

        private void Logout_Click(object sender, EventArgs e)
        {
            InposExtError error = InposExt.Logout(timeout);

            if (error == InposExtError.InposNoError)
                Info.Text = "Kasiyer hesabına çıkıldı.";
            else
                Info.Text = "Kasiyer hesabına çıkılamadı. " 
                          + "Hata: " + ((Int32)error).ToString() + " " + "(" + error.ToString() + ")" + "\n"
                          + ErrorDetailString();
        }


        private void DeleteItem_Click(object sender, EventArgs e)
        {
            InposExtError error = 0;
            InposEcrSaleTotals totals = new InposEcrSaleTotals();
            InposEcrSaleState saleState = InposEcrSaleState.InposSaleWaitingForInput;
            int errorCount = 0;

            error = internalCheckSaleStatus(error, ref saleState, ref errorCount);
            
            InposSaleReceipt r = new InposSaleReceipt((UInt32)ReceiptNo.Value, (UInt32)ZNo.Value);
            error = InposExt.ReceiptData(timeout, ref r, ref totals);
            UInt32 index = (UInt32)PaymentAmount.Value;

            if (index > totals.itemCount -1)
            {
                error = InposExtError.InposInvalidArgumentError;
                Info.Text = "Hata: " + ((Int32)error).ToString() + " " + "(" + error.ToString() + ")";
            }
            else
            {
                error = InposExt.DeleteSaleItem(timeout, (UInt32)PaymentAmount.Value, ref totals);

                if (error == InposExtError.InposNoError)
                {
                    Info.Text = "Satış kalemi silindi.";
                    Info.Text += Environment.NewLine + "Toplam: " + totals.totalAmount.ToString() + " KDV: " + totals.totalVat.ToString() +
                                 " Tahsilat Tutarı: " + totals.amountToPay.ToString() + " Kalem: " + totals.itemCount;
                }
                else
                {
                    Info.Text = "Hata: " + ((Int32)error).ToString() + " " + "(" + error.ToString() + ")" + "\n"
                              + ErrorDetailString();
                }
            }   
        }

        private void StartSaleWithInvoice_Click(object sender, EventArgs e)
        {
            InposExtError error = InposExt.StartSaleWithInvoice(timeout);

            if (error == InposExtError.InposNoError)
                Info.Text = "Faturalı satış başladı.";
            else
                Info.Text = "Faturalı satış başlatılamadı. "
                          + "Hata: " + ((Int32)error).ToString() + " " + "(" + error.ToString() + ")" + "\n"
                          + ErrorDetailString();
        }

        private void EndSaleWithInvoice_Click(object sender, EventArgs e)
        {
            InposInvoiceData data;
            data.invoiceType = (Inpos.InvoiceType)InvoiceTypeComboBox.SelectedIndex;
            data.noType = (Inpos.CustomerNoType)CustomerNoTypeComboBox.SelectedIndex;
            data.slipCount = (UInt32)SlipCountComboBox.SelectedIndex + 1;
            data.printDeliveryNote = (UInt32)(PrintDeliveryNoteCheckBox.Checked ? 1 : 0);

            data.invoiceNo = InvoiceNoText.Text;
            data.customerNo = CustomerNoText.Text;

            InposEcrState ecrState;
            InposExtError error = InposExt.EndSaleWithInvoice(ref data);

            if (error == InposExtError.InposNoError)
                Info.Text = "Faturalı satış sonlandırma komutu gönderildi.";
            else
                Info.Text = "Faturalı satış sonlandırma komutu gönderilemedi. " 
                          + "Hata: " + ((Int32)error).ToString() + " " + "(" + error.ToString() + ")" + "\n"
                          + ErrorDetailString();

            if (error == InposExtError.InposNoError)
            {
                InposSaleReceipt r = new InposSaleReceipt((UInt32)ReceiptNo.Value, (UInt32)ZNo.Value);

                Info.Text = "Fatura bekleniyor... ";
                Application.DoEvents();

                    InposEcrSaleTotalsExt totals = new InposEcrSaleTotalsExt();

                    error = InposExt.WaitReceiptData(5 * 60 * 1000, ref r, ref totals);

                    if (error == InposExtError.InposNoError)
                    {
                        DumpReceipt(totals);
                    }

                InposExt.EcrState(timeout, out ecrState);
                if(ecrState == InposEcrState.InposEcrMainMenu)
                {
                    Info.Text += "Faturalı Satış Sonlandırıldı. ";
                }
            }

            if (error != InposExtError.InposNoError)
                Info.Text = "Hata: " + ((Int32)error).ToString();
        }

        private void EndSaleWithReturnedItemsSlip_Click(object sender, EventArgs e)
        {
            InposEcrState ecrState = 0;
            InposExtError error = 0;
            int errorCount = 0;
            internalCheckEcrStatus(error, ref ecrState, ref errorCount);

            error = InposExt.EndSaleWithReturnedItemsSlip((PaymentType)PaymentTypeComboBox.SelectedIndex);

            if (error == InposExtError.InposNoError)
            {
                Info.Text = "Gider pusulası sonlandırma komutu gönderildi.";
                Thread.Sleep(200);      //Wait ecr for print slip and change its state or write your code for data transfer.
                internalCheckEcrStatus(error, ref ecrState, ref errorCount);
                errorCount = 0;
                while(ecrState != InposEcrState.InposEcrMainMenu)
                {
                    Application.DoEvents();
                    internalCheckEcrStatus(error, ref ecrState, ref errorCount);
                    if(errorCount >= 10)
                    {
                        Info.Text = "Satış tamamlanma bilgisi alınırken bir sorun oluştu. Oluşan hata: " + error.ToString() + "\n"
                                  + "Hata öncesi tespit edilen son yazarkasa durumu: " + ecrState.ToString() + "\n"
                                  + "Satış tamamlanma sorgusu sonlandırılıyor. Fişin bitip bitmediğinden emin olmak için fiş bilgisi" + "\n"
                                  + "metodunu kullanın.";
                        break;
                    }
                }
                if(ecrState == InposEcrState.InposEcrMainMenu)
                {
                    Info.Text = "Gider pusulası sonlandırma tamamlandı.";
                }
            }
            else
                Info.Text = "Gider pusulası sonlandırma komutu gönderilemedi. "
                          + "Hata: " + ((Int32)error).ToString() + " " + "(" + error.ToString() + ")" + "\n"
                          + ErrorDetailString();
        }

        private void AddMultipleSaleItems_Click(object sender, EventArgs e)
        {
            if (saleItems.count < InposEcrMultipleSaleItems.MAX_SALE_ITEM_COUNT)
            {
                UInt16 index = saleItems.count;

                saleItems.items[index].name = ItemName.Text;

                saleItems.items[index].unitPrice = (UInt64)UnitPrice.Value;
                saleItems.items[index].multiplier = (UInt32)Multiplier.Value;
                saleItems.items[index].discountRate = (Int32)DiscountRate.Value;
                saleItems.items[index].discountAmount = (UInt64)DiscountAmount.Value;
                saleItems.items[index].section = (byte)Section.Value;
                saleItems.items[index].unit = (Inpos.Unit)UnitComboBox.SelectedIndex;
                
                saleItems.count++;
            }
        }

        private void LastZDateTime_Click(object sender, EventArgs e)
        {
            Int32 zdt = 0;

            InposExtError error = InposExt.LastZDateTime(timeout, ref zdt);

            if (error == InposExtError.InposNoError)
                Info.Text = "Son Z: " + InposExt.FromUnixTime(zdt).ToString("dd.MM.yyyy HH:mm:ss");
            else
                Info.Text = "Son Z tarihi alınamadı. " 
                          + "Hata: " + ((Int32)error).ToString() + " " + "(" + error.ToString() + ")" + "\n"
                          + ErrorDetailString();
        }

        private void DeviceDateTime_Click(object sender, EventArgs e)
        {
            Int32 edt =  0;

            InposExtError error = InposExt.EcrDateTime(timeout, ref edt);

            if (error == InposExtError.InposNoError)
                Info.Text = "Yazarkasa Saati: " + InposExt.FromUnixTime(edt).ToString("dd.MM.yyyy HH:mm:ss");
            else
                Info.Text = "Yazarkasa saati alınamadı. "
                          + "Hata: " + ((Int32)error).ToString() + " " + "(" + error.ToString() + ")" + "\n"
                          + ErrorDetailString();
        }

        private void ActiveAcquirers_Click(object sender, EventArgs e)
        {
            Int32[] ids = new Int32[10];
            Int32 size = ids.Length;

            InposExtError error = InposExt.ActiveAcquirers(timeout, ids, ref size);

            if (error == InposExtError.InposNoError)
            {
                if (size == 0)
                {
                    Info.Text = "Etkin banka yok.";
                }
                else
                {
                    Info.Text = "Etkin Bankalar: ";

                    for (int i = 0; i < size; i++)
                        Info.Text += ids[i].ToString() + " ";
                }
            }
            else if (error == InposExtError.InposInvalidArgumentError && size == -1)
            {
                Info.Text = "Banka ID dizisinin kapasitesi yetersiz.";
            }
            else
            {
                Info.Text = "Etkin banka listesi alınamadı. " 
                          + "Hata: " + ((Int32)error).ToString() + " " + "(" + error.ToString() + ")" + "\n"
                          + ErrorDetailString();
            }
        }

        public String ErrorDetailString()
        {
            InposExtErrorDetail errorDetail = InposExt.ErrorDetail();

            if (errorDetail == InposExtErrorDetail.InposNoErrorDetail)
                return "";

            return "Hata Detayı: " + ((Int32)errorDetail).ToString() + " " + "(" + errorDetail.ToString() + ")";
        }

        private void SaleTypeComboBox_SelectedIndexChanged(object sender, EventArgs e)
        {
            Inpos.InposSaleType type = (Inpos.InposSaleType)SaleTypeComboBox.SelectedIndex;

            InposExtError error = InposExt.SetSaleType(timeout, (Inpos.InposSaleType)SaleTypeComboBox.SelectedIndex);

            if (error == InposExtError.InposNoError)
                Info.Text = "Satış Tipi:" + ((Inpos.InposSaleType)SaleTypeComboBox.SelectedIndex).ToString();
            else
                Info.Text = "Satış tipi değiştirilemedi. "
                          + "Hata: " + ((Int32)error).ToString() + " " + "(" + error.ToString() + ")" + "\n"
                          + ErrorDetailString();
        }

        private void BlockEcrKeys_Click(object sender, EventArgs e)
        {
            InposExtError error = InposExt.BlockEcrKeys();

            if (error == InposExtError.InposNoError)
                Info.Text = "";
            else
                Info.Text = "Hata: " + ((Int32)error).ToString() + " " + "(" + error.ToString() + ")" + "\n"
                          + ErrorDetailString();
        }

        private void UnblockEcrKeys_Click(object sender, EventArgs e)
        {
            InposExtError error = InposExt.UnblockEcrKeys();

            if (error == InposExtError.InposNoError)
                Info.Text = "";
            else
                Info.Text = "Hata: " + ((Int32)error).ToString() + " " + "(" + error.ToString() + ")" + "\n"
                          + ErrorDetailString();
        }

        private void KeyBlockStatus_Click(object sender, EventArgs e)
        {
            Int32 status = 0;

            InposExtError error = InposExt.EcrKeyBlockingStatus(timeout, ref status);

            if (error == InposExtError.InposNoError)
                Info.Text = "Tuş Kilit Durumu:" + (status == 0 ? "Kilit Yok" : "Kilitli");
            else
                Info.Text = "Hata: " + ((Int32)error).ToString() + " " + "(" + error.ToString() + ")" + "\n"
                          + ErrorDetailString();
        }

        public static DialogResult InputBox(String title, String promptText, ref String value)
        {
            Form form = new Form();
            Label label = new Label();
            TextBox textBox = new TextBox();
            Button buttonOk = new Button();
            Button buttonCancel = new Button();

            form.Text = title;
            label.Text = promptText;
            textBox.Text = value;

            buttonOk.Text = "OK";
            buttonCancel.Text = "Cancel";
            buttonOk.DialogResult = DialogResult.OK;
            buttonCancel.DialogResult = DialogResult.Cancel;

            label.SetBounds(10, 20, 30, 15);
            textBox.SetBounds(10, 36, 300, 20);
            buttonOk.SetBounds(100, 72, 75, 23);
            buttonCancel.SetBounds(200, 72, 75, 23);

            label.AutoSize = true;
            textBox.Anchor = textBox.Anchor | AnchorStyles.Right;
            buttonOk.Anchor = AnchorStyles.Bottom | AnchorStyles.Right;
            buttonCancel.Anchor = AnchorStyles.Bottom | AnchorStyles.Right;

            form.ClientSize = new Size(320, 100);
            form.Controls.AddRange(new Control[] { label, textBox, buttonOk, buttonCancel });
            form.ClientSize = new Size(Math.Max(300, label.Right + 10), form.ClientSize.Height);
            form.FormBorderStyle = FormBorderStyle.FixedDialog;
            form.StartPosition = FormStartPosition.CenterScreen;
            form.MinimizeBox = false;
            form.MaximizeBox = false;
            form.AcceptButton = buttonOk;
            form.CancelButton = buttonCancel;

            DialogResult dialogResult = form.ShowDialog();
            value = textBox.Text;
            return dialogResult;
        }

        public static void OutputBox(String title, String text)
        {
            Form form = new Form();
            RichTextBox textBox = new RichTextBox();

            form.Text = title;
            textBox.Text = Encoding.UTF8.GetString(Encoding.Default.GetBytes(text));

            textBox.SelectAll();
            textBox.SelectionAlignment = HorizontalAlignment.Center;
            textBox.SelectionLength = 0;

            textBox.SetBounds(10, 10, 190, 190);
            textBox.Anchor = textBox.Anchor | AnchorStyles.Right;
            
            form.ClientSize = new Size(200, 200);
            form.Controls.AddRange(new Control[] { textBox });
            form.ClientSize = new Size(Math.Max(300, textBox.Right + 10), form.ClientSize.Height);
            form.FormBorderStyle = FormBorderStyle.FixedDialog;
            form.StartPosition = FormStartPosition.CenterScreen;
            form.MinimizeBox = false;
            form.MaximizeBox = false;

            form.Show();
        }

        private void CashierNameToolStripMenuItem_Click(object sender, EventArgs e)
        {
            String name = "";

            if(InputBox("Kasiyer Adı", "", ref name) == DialogResult.OK)
            {
                InposExtError error = InposExt.SetCashierName(timeout, name);

                if (error == InposExtError.InposNoError)
                    Info.Text = "";
                else
                    Info.Text = "Hata: " + ((Int32)error).ToString() + " " + "(" + error.ToString() + ")" + "\n"
                              + ErrorDetailString();
            }
        }

        private void ECRStateToolStripMenuItem_Click(object sender, EventArgs e)
        {
            InposEcrState ecrState;
            InposEcrSaleState saleState;

            InposExtError error = InposExt.EcrSaleState(timeout, out ecrState, out saleState);

            if (error == InposExtError.InposNoError)
                Info.Text = "Yazarkasa: " + ecrState.ToString() + " Satış: " + saleState.ToString();
            else
                Info.Text = "Hata: " + ((Int32)error).ToString() + " " + "(" + error.ToString() + ")" + "\n"
                          + ErrorDetailString();
        }

        private void bankaBilgileriToolStripMenuItem_Click(object sender, EventArgs e)
        {
            Int32[] ids = new Int32[10];
            Int32 size = ids.Length;

            InposExtError error = InposExt.AcquirersOfSale(timeout, ids, ref size);

            if (error == InposExtError.InposNoError)
            {
                if (size == 0)
                {
                    Info.Text = "Son satış işleminde banka işlemi yok ya da cihaz açıldıktan sonra satış yapılmamış.";
                }
                else
                {
                    Info.Text = "Son satış işlemi bankaları: ";

                    for (int i = 0; i < size; i++)
                        Info.Text += ids[i].ToString() + " ";
                }
            }
            else if (error == InposExtError.InposInvalidArgumentError && size == -1)
            {
                Info.Text = "Banka ID dizisinin kapasitesi yetersiz.";
            }
            else
            {
                Info.Text = "Son satış işlemi banka listesi alınamadı. "
                          + "Hata: " + ((Int32)error).ToString() + " " + "(" + error.ToString() + ")" + "\n"
                          + ErrorDetailString();
            }
        }

        private void tutarBilgileriToolStripMenuItem_Click(object sender, EventArgs e)
        {
            UInt64[] amounts = new UInt64[10];
            Int32 size = amounts.Length;

            InposExtError error = InposExt.TransactionAmountsOfSale(timeout, amounts, ref size);

            if (error == InposExtError.InposNoError)
            {
                if (size == 0)
                {
                    Info.Text = "Son satış işleminde tutar yok ya da cihaz açıldıktan sonra satış yapılmamış.";
                }
                else
                {
                    Info.Text = "Son satış işlemi tutarları: ";

                    for (int i = 0; i < size; i++)
                        Info.Text += amounts[i].ToString() + " ";
                }
            }
            else if (error == InposExtError.InposInvalidArgumentError && size == -1)
            {
                Info.Text = "Tutar dizisinin kapasitesi yetersiz.";
            }
            else
            {
                Info.Text = "Son satış işlemi tutar listesi alınamadı. "
                          + "Hata: " + ((Int32)error).ToString() + " " + "(" + error.ToString() + ")" + "\n"
                          + ErrorDetailString();
            }
        }

        private void kısımBilgileriToolStripMenuItem_Click(object sender, EventArgs e)
        {
            InposEcrVatData vatData = new InposEcrVatData();

            InposExtError error = InposExt.VatDataOfSale(timeout, ref vatData);

            if (error == InposExtError.InposNoError)
            {
                Info.Text = "Son satış Kısım: ";

                for (int i = 0; i < InposEcrVatData.MAX_VAT_ITEM_COUNT; i++)
                {
                    Info.Text += vatData.vatRates[i].ToString() + "-" + vatData.vatAmounts[i].ToString() + "-" + vatData.amounts[i].ToString() + " ; ";
                }
            }
            else
            {
                Info.Text = "Son satış Kısım listesi alınamadı. "
                          + "Hata: " + ((Int32)error).ToString() + " " + "(" + error.ToString() + ")" + "\n"
                          + ErrorDetailString();
            }
        }

        private void xVerisiToolStripMenuItem_Click(object sender, EventArgs e)
        {
            String buffer;
            Int32 size = 8 * 1024;

            String zNo = "1";

            if (InputBox("Z No", "", ref zNo) == DialogResult.OK)
            {
                InposExtError error = InposExt.XData(timeout, UInt16.Parse(zNo), out buffer, ref size);

                if (error == InposExtError.InposNoError)
                {
                    Info.Text = "";

                    OutputBox("X Data", buffer);
                }
                else
                    Info.Text = "Hata: " + ((Int32)error).ToString() + " " + "(" + error.ToString() + ")" + "\n"
                              + ErrorDetailString();
            }
        }

        private void zVerisiToolStripMenuItem_Click(object sender, EventArgs e)
        {
            String zNo = "1";

            if (InputBox("Z No", "", ref zNo) == DialogResult.OK)
            {
                String buffer;
                Int32 size = 4 * 1024;

                InposExtError error = InposExt.ZData(timeout, UInt16.Parse(zNo), out buffer, ref size);

                if (error == InposExtError.InposNoError)
                {
                    Info.Text = "";

                    OutputBox("Z Data", buffer);
                }
                else
                {
                    Info.Text = "Hata: " + ((Int32)error).ToString() + " " + "(" + error.ToString() + ")" + "\n"
                              + ErrorDetailString();
                }
            }
        }

        private void fMVerisiZToolStripMenuItem_Click(object sender, EventArgs e)
        {
            String zNo_1 = "", zNo_2 = "";

            if (InputBox("Z No 1", "", ref zNo_1) == DialogResult.OK)
            {
                String buffer;
                Int32 size = 12 * 1024;

                if (InputBox("Z No 2", "", ref zNo_2) == DialogResult.OK)
                {
                    InposExtError error = InposExt.FMDataZNo(10*timeout, UInt16.Parse(zNo_1), UInt16.Parse(zNo_2), out buffer, ref size);

                    if (error == InposExtError.InposNoError)
                    {
                        Info.Text = "";

                        OutputBox("FM Data (Z)", buffer);
                    }
                    else
                    {
                        Info.Text = "Hata: " + ((Int32)error).ToString() + " " + "(" + error.ToString() + ")" + "\n"
                                  + ErrorDetailString();
                    }
                }
            }
        }

        private void fMVerisiTarihToolStripMenuItem_Click(object sender, EventArgs e)
        {
            String startDate = "", endDate = "";

            if (InputBox("Başlangıç Tarihi (YYYYMMDD)", "", ref startDate) == DialogResult.OK)
            {
                String buffer;
                Int32 size = 12 * 1024;

                if (InputBox("Bitiş Tarihi (YYYYMMDD)", "", ref endDate) == DialogResult.OK)
                {
                    InposExtError error = InposExt.FMDataDate(10*timeout, UInt32.Parse(startDate), UInt32.Parse(endDate), out buffer, ref size);

                    if (error == InposExtError.InposNoError)
                    {
                        Info.Text = "";

                        OutputBox("FM Data (Date)", buffer);
                    }
                    else
                    {
                        Info.Text = "Hata: " + ((Int32)error).ToString() + " " + "(" + error.ToString() + ")" + "\n"
                                  + ErrorDetailString();
                    }
                }
            }
        }

        private void ExternalPrinterOpenToolStripMenuItem_Click(object sender, EventArgs e)
        {        
            InposExtError error = InposExt.ExternalPrinterOpen(timeout);

            if (error == InposExtError.InposNoError)
            {
                Info.Text = Info.Text = "ExternalPrinterOpen: OK";
            }
            else
            {
                Info.Text = "Hata: " + ((Int32)error).ToString() + " " + "(" + error.ToString() + ")" + "\n"
                          + ErrorDetailString();
            }
        }

        private void ExternalPrinterCloseToolStripMenuItem_Click(object sender, EventArgs e)
        {
            InposExtError error = InposExt.ExternalPrinterClose();

            if (error == InposExtError.InposNoError)
            {
                Info.Text = Info.Text = "ExternalPrinterClose: OK";
            }
            else
            {
                Info.Text = "Hata: " + ((Int32)error).ToString() + " " + "(" + error.ToString() + ")" + "\n"
                          + ErrorDetailString();
            }
        }

        private void ExternalPrinterReadToolStripMenuItem_Click(object sender, EventArgs e)
        {           
            String ReadSize = "";

            if (InputBox("Okuma Boyutu", "", ref ReadSize) == DialogResult.OK)
            {
                InposExt.ExternalPrinterBuffer buffer = new InposExt.ExternalPrinterBuffer(Int32.Parse(ReadSize));
                
                InposExtError error = InposExt.ExternalPrinterRead(timeout, ref buffer);

                if (error == InposExtError.InposNoError)
                {
                    Info.Text = "ExternalPrinterRead[" + buffer.size.ToString() + "]: ";

                    for (int i = 0; i < buffer.size; i++)
                    {
                        Info.Text += buffer.data[i].ToString("X2");
                    }
                }
                else
                {
                    Info.Text = "Hata: " + ((Int32)error).ToString() + " " + "(" + error.ToString() + ")" + "\n"
                              + ErrorDetailString();
                }

            }            
        }

        private void ExternalPrinterWriteToolStripMenuItem_Click(object sender, EventArgs e)
        {
            String WriteData = "";

            if (InputBox("Yazılacak Veri (Hex)", "", ref WriteData) == DialogResult.OK)
            {
                InposExt.ExternalPrinterBuffer buffer = new InposExt.ExternalPrinterBuffer(WriteData.Length/2);

                for (int i = 0; i < buffer.size; i++)
                {
                    buffer.data[i] = Convert.ToByte(WriteData.Substring(i * 2, 2), 16);
                }

                if (buffer.size == 0)
                {
                    Info.Text = "Hata: Yazılacak Veri yok";
                }
                else
                {
                    InposExtError error = InposExt.ExternalPrinterWrite(timeout, ref buffer);
                    if (error == InposExtError.InposNoError)
                    {
                        Info.Text = "ExternalPrinterWrite: OK";
                    }
                    else
                    {
                        Info.Text = "Hata: " + ((Int32)error).ToString() + " " + "(" + error.ToString() + ")" + "\n"
                                  + ErrorDetailString();
                    }
                }
            }
        }
    }
}
